import sys
from pathlib import Path

# Add parent directory to path for imports
current_dir = Path(__file__).parent.parent
sys.path.insert(0, str(current_dir))

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import math
from datetime import datetime
from uuid import uuid4

# Import services
from services.supabase_service import supabase
from services.gemini_service import get_text_embeddings, get_gemini_model

router = APIRouter()

class ChatRequest(BaseModel):
    bot_id: str
    user_query: str
    top_k: int = 3  # Number of context chunks to use

@router.post("/chat")
def chat(request: ChatRequest):
    print("/chat called with:", request)
    # 1. Embed the user query
    try:
        query_embedding = get_text_embeddings([request.user_query])[0]
        print("Query embedding computed.")
    except Exception as e:
        print("Error in embedding user query:", e)
        raise HTTPException(status_code=500, detail=f"Embedding error: {str(e)}")

    # 2. Retrieve all embeddings for the bot
    try:
        res = supabase.table("embeddings").select("chunk_text,embedding").eq("bot_id", request.bot_id).execute()
        print("Embeddings fetched:", res.data)
        if not res.data or len(res.data) == 0:
            print("No embeddings found for this bot.")
            raise HTTPException(status_code=404, detail="No embeddings found for this bot.")
    except Exception as e:
        print("Error fetching embeddings:", e)
        raise HTTPException(status_code=500, detail=f"Failed to fetch embeddings: {str(e)}")

    # 3. Compute cosine similarity (without numpy)
    chunk_texts = []
    similarities = []
    try:
        def cosine_similarity(vec1, vec2):
            """Compute cosine similarity without numpy"""
            dot_product = sum(a * b for a, b in zip(vec1, vec2))
            norm1 = math.sqrt(sum(a * a for a in vec1))
            norm2 = math.sqrt(sum(a * a for a in vec2))
            return dot_product / (norm1 * norm2 + 1e-8)
        
        for row in res.data:
            chunk_embedding = row["embedding"]
            sim = cosine_similarity(query_embedding, chunk_embedding)
            similarities.append(sim)
            chunk_texts.append(row["chunk_text"])
        print("Similarities computed.")
    except Exception as e:
        print("Error computing similarities:", e)
        raise HTTPException(status_code=500, detail=f"Similarity computation error: {str(e)}")

    # 4. Select top-k most similar chunks
    try:
        top_k = min(request.top_k, len(similarities))
        # Sort by similarity and get top k indices
        indexed_similarities = [(i, sim) for i, sim in enumerate(similarities)]
        indexed_similarities.sort(key=lambda x: x[1], reverse=True)
        top_indices = [i for i, _ in indexed_similarities[:top_k]]
        
        context_chunks = [chunk_texts[i] for i in top_indices]
        context = "\n".join(context_chunks)
        print("Context chunks selected.")
    except Exception as e:
        print("Error selecting context chunks:", e)
        raise HTTPException(status_code=500, detail=f"Context selection error: {str(e)}")

    # 5. Send context and user query to Gemini
    prompt = f"Context:\n{context}\n\nUser question: {request.user_query}\nAnswer:"
    try:
        gemini = get_gemini_model()
        response = gemini.generate_content(prompt)
        answer = response.text if hasattr(response, 'text') else str(response)
        print("Gemini response received.")
    except Exception as e:
        print("Gemini API error:", e)
        raise HTTPException(status_code=500, detail=f"Gemini API error: {str(e)}")

    # 6. Store the conversation in chat_history table
    try:
        timestamp = datetime.utcnow().isoformat()
        
        # Store user message (let Supabase auto-generate UUID for id)
        user_message = {
            "bot_id": request.bot_id,  # This should be a UUID string that matches bots.id
            "role": "user",
            "message": request.user_query,
            "created_at": timestamp
        }
        supabase.table("chat_history").insert(user_message).execute()
        
        # Store bot response (let Supabase auto-generate UUID for id)
        bot_message = {
            "bot_id": request.bot_id,  # This should be a UUID string that matches bots.id
            "role": "bot",
            "message": answer,
            "created_at": timestamp
        }
        supabase.table("chat_history").insert(bot_message).execute()
        
        print("Chat history stored successfully.")
    except Exception as e:
        print("Error storing chat history:", e)
        # Don't fail the request if storing history fails
        pass

    return {
        "answer": answer,
        "context_chunks": context_chunks
    } 