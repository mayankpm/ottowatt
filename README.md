# PDF Text Extractor with GPT Integration

## Overview

This project is a **PDF text extraction and structuring tool** designed to streamline workflows involving PDF files. It allows users to upload a PDF, extract its text content, and optionally use GPT-based APIs to structure the extracted text. This system is built for scalability and leverages **AWS infrastructure** to handle PDF storage and text processing efficiently.

### Key Features

- **PDF Upload**: Users can upload PDFs directly via a web interface.
- **Text Extraction**: Text is extracted using a combination of techniques, including:
  - Direct extraction via `PyPDF2`.
  - Advanced OCR using **AWS Textract** for scanned PDFs.
- **Text Structuring**: Extracted text is optionally processed using GPT APIs to provide a structured output.
- **Scalable Backend**: Built on Flask and deployed on AWS EC2 for full control.
- **File Storage**: Utilizes AWS S3 for storing uploaded and processed PDFs.

---

## Tech Stack

### Frontend
- **Framework**: Next.js (TypeScript)
- **Styling**: Custom CSS (`Page.css`)
- **Deployment**: Vercel ([Deployed Site](https://ottowatt.vercel.app/))

### Backend
- **Framework**: Flask
- **Libraries**: PyPDF2, boto3 (for AWS integration), OpenAI
- **Deployment**: AWS EC2
- **Text Processing**: AWS Textract for OCR

### Cloud Infrastructure
- **AWS S3**: Used for PDF storage.
- **AWS Textract**: For OCR-based text extraction.
- **AWS EC2**: Backend hosting for flexibility and configuration control.

---

## How It Works

### Frontend Workflow
1. Users upload a PDF via the frontend.
2. An input field collects the user's GPT API key, if provided.
3. The file and API key are sent to the backend for processing.

### Backend Workflow
1. PDFs are stored temporarily in the `/tmp` directory for preprocessing.
2. Text is extracted directly using `PyPDF2`. If unsuccessful, the file is uploaded to an **S3 bucket**, and **AWS Textract** performs OCR-based text extraction.
3. Extracted text is cleaned and structured using OpenAI's GPT API (if an API key is provided).
4. The processed text is returned to the frontend.

### Deployment
- The **frontend** is deployed on **Vercel**.
- The **backend** runs on **AWS EC2**, providing full control over the setup.

---

## Installation and Usage

### Frontend Setup
1. Navigate to the `frontend` directory:
   ```
   cd frontend
   ```

    Install dependencies:
    ```
    npm install
    ```

2. Run the development server:
    ```
    npm run dev
    ```


  Access the frontend at http://localhost:3000 (or the deployed link).

Backend Setup

  1. Create a Python virtual environment:
    ```
    python -m venv venv
    source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
    ```

2. Install dependencies from requirements.txt:
    ```
    pip install -r requirements.txt
    ```

3. Run the Flask app using Gunicorn for production:
    ```
        gunicorn app:app --bind 0.0.0.0:5000
    ```
  Access the backend at http://localhost:5000.
## AWS Integration

### S3 Bucket
- All PDFs are uploaded and stored in a dedicated AWS S3 bucket: `extraction-text-pdf-storage-bucket`.

### Textract
- Used as a fallback for OCR-based text extraction for scanned or image-heavy PDFs.

### EC2 Hosting
- The backend is hosted on an AWS EC2 instance, providing complete control for setup and configuration.

---

## Deployed URLs

- **Frontend**: [https://ottowatt.vercel.app/](https://ottowatt.vercel.app/)
