import os
import google.generativeai as genai
from typing import List
import requests

# Load environment variables
from dotenv import load_dotenv
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

def get_text_embeddings(chunks: List[str]) -> List[list]:
    """
    Generate embeddings using free APIs in order of preference:
    1. HuggingFace Inference API (free, high quality)
    2. Google Gemini embeddings (free)
    3. Cohere embeddings (free tier)
    """
    try:
        # Option 1: HuggingFace Inference API (FREE & HIGH QUALITY)
        try:
            API_URL = "https://api-inference.huggingface.co/pipeline/feature-extraction/BAAI/bge-base-en-v1.5"
            
            # HuggingFace allows anonymous requests (no API key needed for inference)
            # But having an API key removes rate limits
            hf_api_key = os.getenv("HUGGINGFACE_API_KEY", "")
            headers = {"Authorization": f"Bearer {hf_api_key}"} if hf_api_key else {}
            
            embeddings = []
            for chunk in chunks:
                response = requests.post(API_URL, headers=headers, json={
                    "inputs": chunk,
                    "options": {"wait_for_model": True}
                })
                
                if response.status_code == 200:
                    embedding = response.json()
                    if isinstance(embedding, list) and len(embedding) > 0:
                        embeddings.append(embedding)
                    else:
                        raise Exception("Invalid embedding format")
                else:
                    # If rate limited, wait and retry once
                    if response.status_code == 503:
                        import time
                        time.sleep(2)
                        response = requests.post(API_URL, headers=headers, json={
                            "inputs": chunk,
                            "options": {"wait_for_model": True}
                        })
                        if response.status_code == 200:
                            embeddings.append(response.json())
                        else:
                            raise Exception(f"HF API failed after retry: {response.status_code}")
                    else:
                        raise Exception(f"HF API failed: {response.status_code}")
            
            print(f"✅ Generated {len(embeddings)} embeddings using HuggingFace API")
            return embeddings
            
        except Exception as hf_error:
            print(f"HuggingFace API failed: {hf_error}")
        
        # Option 2: Google Gemini Embeddings (FREE)
        try:
            embeddings = []
            for chunk in chunks:
                result = genai.embed_content(
                    model="models/text-embedding-004",
                    content=chunk,
                    task_type="retrieval_document"
                )
                embeddings.append(result['embedding'])
            
            print(f"✅ Generated {len(embeddings)} embeddings using Google Gemini")
            return embeddings
            
        except Exception as gemini_error:
            print(f"Gemini embeddings failed: {gemini_error}")
        
        # Option 3: Cohere Embeddings (FREE TIER)
        try:
            cohere_api_key = os.getenv("COHERE_API_KEY")
            if cohere_api_key:
                API_URL = "https://api.cohere.ai/v1/embed"
                headers = {
                    "Authorization": f"Bearer {cohere_api_key}",
                    "Content-Type": "application/json"
                }
                
                response = requests.post(API_URL, headers=headers, json={
                    "texts": chunks,
                    "model": "embed-english-light-v3.0",  # Free tier model
                    "input_type": "search_document"
                })
                
                if response.status_code == 200:
                    data = response.json()
                    embeddings = data["embeddings"]
                    print(f"✅ Generated {len(embeddings)} embeddings using Cohere")
                    return embeddings
                else:
                    raise Exception(f"Cohere API failed: {response.status_code}")
        except Exception as cohere_error:
            print(f"Cohere API failed: {cohere_error}")
        
        # If all APIs fail, raise an error
        raise Exception("All embedding APIs failed. Please check your API keys or internet connection.")
        
    except Exception as e:
        print(f"Error generating embeddings: {str(e)}")
        raise e 