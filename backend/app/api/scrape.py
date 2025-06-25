from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.supabase_service import supabase
from uuid import uuid4
from datetime import datetime
from bs4 import BeautifulSoup
import requests
from app.services.file_parser import chunk_text
from app.services.gemini_service import get_text_embeddings  # Embeddings use HuggingFace bge-base-en

router = APIRouter()

class ScrapeRequest(BaseModel):
    url: str
    bot_id: str = None
    bot_name: str = None
    replace_content: bool = False

def create_new_bot(name: str = None):
    bot_id = str(uuid4())
    created_at = datetime.utcnow().isoformat()
    bot_data = {
        "id": bot_id,
        "name": name,
        "created_at": created_at
    }
    supabase.table("bots").insert(bot_data).execute()
    return bot_id

@router.post("/scrape")
def scrape_url(request: ScrapeRequest):
    if request.bot_id and request.replace_content:
        # Clear existing content for this bot
        bot_id = request.bot_id
        supabase.table("embeddings").delete().eq("bot_id", bot_id).execute()
        supabase.table("documents").delete().eq("bot_id", bot_id).execute()
    elif not request.bot_id:
        # Create a meaningful bot name from the URL if not provided
        bot_name = request.bot_name or f"Web Bot: {request.url}"
        bot_id = create_new_bot(bot_name)
    else:
        # Use existing bot_id (update mode without replacing content)
        bot_id = request.bot_id
    try:
        response = requests.get(request.url, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        # Extract visible text from the page
        for script in soup(["script", "style", "noscript"]):
            script.extract()
        text = " ".join(soup.stripped_strings)
        if not text.strip():
            raise ValueError("No text content found on the page.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to scrape URL: {str(e)}")
    doc_id = str(uuid4())
    created_at = datetime.utcnow().isoformat()
    data = {
        "id": doc_id,
        "bot_id": bot_id,
        "name": request.url,
        "type": "url",
        "content": text,
        "created_at": created_at
    }
    try:
        supabase.table("documents").insert(data).execute()
        # Chunk and embed text, store in embeddings table
        chunks = chunk_text(text)
        embeddings = get_text_embeddings(chunks)
        for idx, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            embedding_data = {
                "id": str(uuid4()),
                "document_id": doc_id,
                "bot_id": bot_id,
                "chunk_index": idx,
                "chunk_text": chunk,
                "embedding": embedding,
                "created_at": created_at
            }
            supabase.table("embeddings").insert(embedding_data).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"id": doc_id, "name": request.url, "type": "url", "created_at": created_at, "bot_id": bot_id} 