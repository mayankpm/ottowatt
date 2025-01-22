import os
import logging
import subprocess
import pytesseract
from flask import Flask, request, jsonify
from pdf2image import convert_from_path
from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # This will enable CORS for all routes


# Load environment variables from .env
load_dotenv()

# Import the OpenAI client exactly as specified
from openai import OpenAI

import boto3
from botocore.exceptions import BotoCoreError, ClientError

logging.basicConfig(level=logging.INFO)

# AWS Configuration
AWS_REGION = "us-east-1"
S3_BUCKET = "extraction-text-pdf-storage-bucket"

# AWS Clients
s3_client = boto3.client("s3", region_name=AWS_REGION)
textract_client = boto3.client("textract", region_name=AWS_REGION)

# Initialize the OpenAI client with your API key from .env
print(os.getenv("OPENAI_API_KEY"))
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def preprocess_pdf(input_path, output_path):
    """
    Preprocess PDF by simplifying it with Ghostscript.
    This can help when dealing with complex PDFs.
    """
    try:
        subprocess.run(
            [
                "gs",
                "-sDEVICE=pdfwrite",
                "-dCompatibilityLevel=1.4",
                "-dPDFSETTINGS=/printer",
                "-dQUIET",
                "-dNOPAUSE",
                "-dBATCH",
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

def pdf_to_images(pdf_path, output_dir):
    """
    Convert PDF pages to PNG images at 300 DPI.
    Returns a list of output image file paths.
    """
    try:
        os.makedirs(output_dir, exist_ok=True)
        images = convert_from_path(pdf_path, dpi=300, output_folder=output_dir, fmt="png")
        image_paths = []
        for i, img in enumerate(images):
            img_path = os.path.join(output_dir, f"page_{i+1}.png")
            img.save(img_path, "PNG")
            image_paths.append(img_path)
        return image_paths
    except Exception as e:
        raise Exception(f"Error converting PDF to images: {e}")

def extract_text_with_tesseract(image_path):
    """
    Extract text from a single image using Tesseract OCR.
    """
    try:
        return pytesseract.image_to_string(image_path)
    except Exception as e:
        raise Exception(f"Error extracting text with Tesseract: {e}")

@app.route("/")
def home():
    return "PDF Processing + GPT API is running!"

@app.route("/upload", methods=["POST"])
def upload_and_process_pdf():
    """
    1. Receives uploaded PDF file (key='file')
    2. Preprocess PDF with Ghostscript
    3. Attempts Amazon Textract
    4. Falls back to Tesseract if Textract fails
    5. Passes extracted text to GPT for structured output
    6. Returns both raw and GPT-structured text
    """
    file = request.files.get("file")
    if not file:
        return jsonify({"error": "No file uploaded"}), 400

    # Prepare local paths
    original_filename = file.filename.replace(" ", "_")
    pdf_path = f"/tmp/{original_filename}"
    preprocessed_pdf_path = f"/tmp/preprocessed_{original_filename}"

    try:
        # Step 1: Save original PDF locally
        file.save(pdf_path)

        # Step 2: Preprocess with Ghostscript
        try:
            preprocess_pdf(pdf_path, preprocessed_pdf_path)
        except Exception as gs_error:
            app.logger.warning(f"Ghostscript failed: {gs_error}. Using original PDF.")
            # Fallback to the original PDF if Ghostscript fails
            preprocessed_pdf_path = pdf_path

        # Step 3: Upload preprocessed PDF to S3
        s3_key = original_filename
        try:
            with open(preprocessed_pdf_path, "rb") as f:
                s3_client.upload_fileobj(f, S3_BUCKET, s3_key)
        except (BotoCoreError, ClientError) as s3_err:
            raise Exception(f"Failed to upload to S3: {s3_err}")

        # Step 4: Attempt Textract
        extracted_text = ""
        try:
            response = textract_client.detect_document_text(
                Document={"S3Object": {"Bucket": S3_BUCKET, "Name": s3_key}}
            )
            extracted_text = "\n".join(
                [block["Text"] for block in response["Blocks"] if block["BlockType"] == "LINE"]
            )
        except Exception as textract_error:
            app.logger.warning(f"Textract failed: {textract_error} - falling back to Tesseract.")

            # Convert PDF to images
            output_dir = "/tmp/images"
            image_paths = pdf_to_images(preprocessed_pdf_path, output_dir)

            # Extract text from each page
            for img_path in image_paths:
                extracted_text += extract_text_with_tesseract(img_path) + "\n"

        # Step 5: Send extracted text to GPT for structuring
        try:
            completion = client.chat.completions.create(
                model="gpt-4o-mini",  # Example model; adjust to your actual model
                messages=[
                    {"role": "developer", "content": "You are a helpful assistant. Please structure the following text:"},
                    {"role": "user", "content": extracted_text.strip()}
                ]
            )
            structured_text = completion.choices[0].message.content
        except Exception as gpt_error:
            # If GPT call fails, just return raw text
            app.logger.error(f"GPT API call failed: {gpt_error}")
            structured_text = "Error calling GPT API."

        # Return combined result
        return jsonify({
            "message": "File processed successfully!",
            "extracted_text": extracted_text.strip(),
            "structured_text": structured_text
        })

    except Exception as e:
        app.logger.error(f"Error processing PDF: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
