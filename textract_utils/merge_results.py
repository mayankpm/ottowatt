def combine_results(textract_text, tesseract_text):
    textract_lines = set(textract_text.splitlines())
    tesseract_lines = set(tesseract_text.splitlines())
    combined_lines = textract_lines.union(tesseract_lines)
    return "\n".join(combined_lines)
