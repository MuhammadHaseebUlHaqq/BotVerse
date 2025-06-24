from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.supabase_service import supabase
from uuid import uuid4
from datetime import datetime

router = APIRouter()

class BotCreateRequest(BaseModel):
    name: str

class BotUpdateRequest(BaseModel):
    name: str = None

@router.post("/bots")
def create_bot(request: BotCreateRequest):
    bot_id = str(uuid4())
    created_at = datetime.utcnow().isoformat()
    data = {
        "id": bot_id,
        "name": request.name,
        "created_at": created_at
    }
    try:
        supabase.table("bots").insert(data).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"id": bot_id, "name": request.name, "created_at": created_at}

@router.get("/bots")
def list_bots():
    try:
        res = supabase.table("bots").select("*").execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/bots/{bot_id}")
def get_bot(bot_id: str):
    try:
        res = supabase.table("bots").select("*").eq("id", bot_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Bot not found")
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/bots/{bot_id}")
def update_bot(bot_id: str, request: BotUpdateRequest):
    try:
        # Check if bot exists
        bot_res = supabase.table("bots").select("*").eq("id", bot_id).execute()
        if not bot_res.data:
            raise HTTPException(status_code=404, detail="Bot not found")
        
        # Update bot details
        update_data = {"updated_at": datetime.utcnow().isoformat()}
        if request.name:
            update_data["name"] = request.name
            
        supabase.table("bots").update(update_data).eq("id", bot_id).execute()
        
        # Return updated bot
        updated_res = supabase.table("bots").select("*").eq("id", bot_id).execute()
        return updated_res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/bots/{bot_id}")
def delete_bot(bot_id: str):
    try:
        # Check if bot exists
        bot_res = supabase.table("bots").select("*").eq("id", bot_id).execute()
        if not bot_res.data:
            raise HTTPException(status_code=404, detail="Bot not found")
        
        # Delete related embeddings first (cascade should handle this, but let's be explicit)
        supabase.table("embeddings").delete().eq("bot_id", bot_id).execute()
        
        # Delete related documents
        supabase.table("documents").delete().eq("bot_id", bot_id).execute()
        
        # Delete chat history
        supabase.table("chat_history").delete().eq("bot_id", bot_id).execute()
        
        # Delete embed tokens
        supabase.table("embed_tokens").delete().eq("bot_id", bot_id).execute()
        
        # Finally delete the bot
        supabase.table("bots").delete().eq("id", bot_id).execute()
        
        return {"message": "Bot deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/bots/{bot_id}/history")
def get_chat_history(bot_id: str):
    try:
        res = supabase.table("chat_history").select("*").eq("bot_id", bot_id).order("created_at", desc=False).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/bots/{bot_id}/clear-content")
def clear_bot_content(bot_id: str):
    """Clear all documents and embeddings for a bot (useful before re-uploading content)"""
    try:
        # Check if bot exists
        bot_res = supabase.table("bots").select("*").eq("id", bot_id).execute()
        if not bot_res.data:
            raise HTTPException(status_code=404, detail="Bot not found")
        
        # Delete embeddings
        supabase.table("embeddings").delete().eq("bot_id", bot_id).execute()
        
        # Delete documents
        supabase.table("documents").delete().eq("bot_id", bot_id).execute()
        
        return {"message": "Bot content cleared successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 