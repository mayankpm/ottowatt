from PIL import Image
import pytesseract

def extract_text_with_tesseract(image_path):
    return pytesseract.image_to_string(Image.open(image_path), lang="eng")
