import fitz  # PyMuPDF

def convert_pdf_to_images(pdf_path, output_dir):
    doc = fitz.open(pdf_path)
    for page_num in range(len(doc)):
        page = doc[page_num]
        pix = page.get_pixmap(dpi=300)
        output_path = f"{output_dir}/page_{page_num + 1}.png"
        pix.save(output_path)
        print(f"Saved: {output_path}")
