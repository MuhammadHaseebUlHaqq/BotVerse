import sys
from pathlib import Path

# Add parent directory to path for imports
current_dir = Path(__file__).parent.parent
sys.path.insert(0, str(current_dir))

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from uuid import uuid4
from datetime import datetime

# Import services
from services.supabase_service import supabase
from services.file_parser import extract_text_from_pdf, extract_text_from_docx, extract_text_from_txt, chunk_text
from services.gemini_service import get_text_embeddings

router = APIRouter()

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

@router.post("/upload")
def upload_document(file: UploadFile = File(...), bot_id: str = Form(None), bot_name: str = Form(None), replace_content: bool = Form(False)):
    if bot_id and replace_content:
        # Clear existing content for this bot
        supabase.table("embeddings").delete().eq("bot_id", bot_id).execute()
        supabase.table("documents").delete().eq("bot_id", bot_id).execute()
    elif not bot_id:
        # Create a meaningful bot name from the filename if not provided
        if not bot_name:
            bot_name = f"Document Bot: {file.filename}"
        bot_id = create_new_bot(bot_name)
    filename = file.filename
    ext = filename.split('.')[-1].lower()
    if ext not in ["pdf", "docx", "txt"]:
        raise HTTPException(status_code=400, detail="Unsupported file type.")
    try:
        if ext == "pdf":
            text = extract_text_from_pdf(file.file)
        elif ext == "docx":
            text = extract_text_from_docx(file.file)
        elif ext == "txt":
            text = extract_text_from_txt(file.file)
        else:
            text = ""
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract text: {str(e)}")
    doc_id = str(uuid4())
    created_at = datetime.utcnow().isoformat()
    data = {
        "id": doc_id,
        "bot_id": bot_id,
        "name": filename,
        "type": ext,
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
    return JSONResponse(content={"id": doc_id, "name": filename, "type": ext, "created_at": created_at, "bot_id": bot_id}) 