import pytesseract
from PIL import Image
import fitz  # PyMuPDF for PDF handling

def extract_text_with_ocr(pdf_path):
    doc = fitz.open(pdf_path)
    text = ""
    for page_num, page in enumerate(doc, start=1):
        pix = page.get_pixmap()
        image = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

        # Perform OCR on the image
        page_text = pytesseract.image_to_string(image)
        text += f"--- Page {page_num} ---\n{page_text}\n"

    return text
