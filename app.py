import os
import logging
import subprocess
import re
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from openai import OpenAI
from PyPDF2 import PdfReader

app = Flask(__name__)
CORS(app)

load_dotenv()
logging.basicConfig(level=logging.INFO)

AWS_REGION = "us-east-1"
S3_BUCKET = "extraction-text-pdf-storage-bucket"
s3_client = boto3.client("s3", region_name=AWS_REGION)
textract_client = boto3.client("textract", region_name=AWS_REGION)

global_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def preprocess_pdf(input_path, output_path):
    """
    Use Ghostscript to remove images from the PDF in order to speed up processing.
    """
    try:
        subprocess.run(
            [
                "gs",
                "-sDEVICE=pdfwrite",
                "-dCompatibilityLevel=1.4",
                "-dPDFSETTINGS=/printer",
                "-dNOPAUSE",
                "-dBATCH",
                "-dSAFER",
                "-dFILTERIMAGE",
                f"-sOutputFile={output_path}",
                input_path
            ],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
    except subprocess.CalledProcessError as e:
        raise Exception(
            f"Ghostscript failed. Return code: {e.returncode}\n"
            f"stderr: {e.stderr.decode('utf-8', errors='ignore')}\n"
            f"stdout: {e.stdout.decode('utf-8', errors='ignore')}"
        )
    except Exception as e:
        raise Exception(f"Error running Ghostscript: {e}")

def extract_text_directly(pdf_path):
    """
    Attempt to directly extract text from a PDF using PyPDF2.
    This approach is much faster for digital PDFs.
    """
    text = ""
    try:
        reader = PdfReader(pdf_path)
        for page in reader.pages:
            page_text = page.extract_text() or ""
            text += page_text
    except Exception as e:
        logging.warning(f"Direct PDF text extraction failed: {e}")
    return text

def clean_extracted_text(text):
    text = ''.join(c for c in text if c.isprintable())
    text = re.sub(r'\s+', ' ', text).strip()
    text = re.sub(r'[\^\x00-\x7F]+', '', text)
    return text

@app.route("/")
def home():
    return "PDF Processing + GPT API is running!"

@app.route("/upload", methods=["POST"])
def upload_and_process_pdf():
    file = request.files.get("file")
    user_api_key = request.form.get("api_key")

    if not file:
        return jsonify({"error": "No file uploaded"}), 400

    local_client = OpenAI(api_key=user_api_key) if user_api_key else global_client

    original_filename = file.filename.replace(" ", "_")
    pdf_path = f"/tmp/{original_filename}"
    preprocessed_pdf_path = f"/tmp/preprocessed_{original_filename}"

    try:
        file.save(pdf_path)

        try:
            preprocess_pdf(pdf_path, preprocessed_pdf_path)
        except Exception as gs_error:
            app.logger.warning(f"Ghostscript failed: {gs_error}. Using original PDF.")
            preprocessed_pdf_path = pdf_path

        extracted_text = extract_text_directly(preprocessed_pdf_path)

        if not extracted_text.strip():
            app.logger.info("Empty text after direct extraction. Attempting Textract.")
            s3_key = original_filename
            try:
                with open(preprocessed_pdf_path, "rb") as f:
                    s3_client.upload_fileobj(f, S3_BUCKET, s3_key)
            except (BotoCoreError, ClientError) as s3_err:
                raise Exception(f"Failed to upload to S3: {s3_err}")

            try:
                response = textract_client.detect_document_text(
                    Document={"S3Object": {"Bucket": S3_BUCKET, "Name": s3_key}}
                )
                extracted_text = "\n".join(
                    [block["Text"] for block in response["Blocks"] if block["BlockType"] == "LINE"]
                )
            except Exception as textract_error:
                app.logger.error(f"Textract failed: {textract_error}")
                return jsonify({"error": "Textract failed to extract text."}), 500

        cleaned_text = clean_extracted_text(extracted_text)

        try:
            completion = local_client.chat.completions.create(  # Use local_client here
                model="gpt-4o-mini",
                messages=[
                    {"role": "developer", "content": "You are a helpful assistant. Please structure the following text, make sure to not provide any comments or any gpt response text, only structured output"},
                    {"role": "user", "content": cleaned_text}
                ]
            )
            structured_text = completion.choices[0].message.content
        except Exception as gpt_error:
            app.logger.error(f"GPT API call failed: {gpt_error}")
            structured_text = "Error calling GPT API."

        return jsonify({
            "message": "File processed successfully!",
            "extracted_text": cleaned_text,
            "structured_text": structured_text
        })
    except Exception as e:
        app.logger.error(f"Error processing PDF: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
