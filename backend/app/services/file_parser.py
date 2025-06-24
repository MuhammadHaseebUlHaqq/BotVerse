from PyPDF2 import PdfReader
from docx import Document
from typing import BinaryIO

def extract_text_from_pdf(file: BinaryIO) -> str:
    reader = PdfReader(file)
    text = ""
    for page in reader.pages:
        text += page.extract_text() or ""
    return text

def extract_text_from_docx(file: BinaryIO) -> str:
    doc = Document(file)
    text = "\n".join([para.text for para in doc.paragraphs])
    return text

def extract_text_from_txt(file: BinaryIO) -> str:
    return file.read().decode("utf-8")

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list:
    """
    Split text into chunks of chunk_size with specified overlap.
    Returns a list of text chunks.
    """
    chunks = []
    start = 0
    text_length = len(text)
    while start < text_length:
        end = min(start + chunk_size, text_length)
        chunk = text[start:end]
        if chunk.strip():
            chunks.append(chunk)
        start += chunk_size - overlap
    return chunks 