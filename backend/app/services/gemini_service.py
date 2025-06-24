import os
from dotenv import load_dotenv
import google.generativeai as genai
from typing import List
from sentence_transformers import SentenceTransformer

load_dotenv()

# Gemini setup for chatbot/generation
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("Gemini API key is not set in environment variables.")
genai.configure(api_key=GEMINI_API_KEY)



def get_gemini_model(model_name="gemini-2.0-flash-lite"):
    """
    Returns a Gemini GenerativeModel for chatbot/generation tasks.
    Default is 'gemini-2.0-flash-lite' for better rate limits.
    """
    return genai.GenerativeModel(model_name)

# HuggingFace BGE model for embeddings only
bge_model = SentenceTransformer("BAAI/bge-base-en-v1.5")

def get_text_embeddings(chunks: List[str]) -> List[list]:
    """
    Generate embeddings for a list of text chunks using BGE-Base-EN (HuggingFace).
    Returns a list of embedding vectors (list of floats).
    """
    # BGE models recommend this prompt prefix for retrieval tasks
    processed_chunks = [f"Represent this sentence for retrieval: {chunk}" for chunk in chunks]
    embeddings = bge_model.encode(processed_chunks, show_progress_bar=False)
    return embeddings.tolist() 