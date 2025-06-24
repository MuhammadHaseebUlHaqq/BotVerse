import sys
from pathlib import Path

# Add parent directory to path for imports
current_dir = Path(__file__).parent.parent
sys.path.insert(0, str(current_dir))

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel
import math
from datetime import datetime
import secrets
from typing import Optional

# Import services
from services.supabase_service import supabase
from services.gemini_service import get_text_embeddings, get_gemini_model

router = APIRouter()

class EmbedChatRequest(BaseModel):
    bot_id: str
    user_query: str
    embed_token: str
    top_k: int = 3

class GenerateEmbedRequest(BaseModel):
    bot_id: str

@router.post("/embed/generate")
def generate_embed_code(request: GenerateEmbedRequest):
    """Generate embed code for a bot"""
    try:
        # Verify bot exists
        bot_res = supabase.table("bots").select("*").eq("id", request.bot_id).execute()
        if not bot_res.data:
            raise HTTPException(status_code=404, detail="Bot not found")
        
        bot = bot_res.data[0]
        
        # Generate unique embed token
        embed_token = secrets.token_urlsafe(32)
        
        # Store embed token in database
        embed_data = {
            "bot_id": request.bot_id,
            "embed_token": embed_token,
            "created_at": datetime.utcnow().isoformat(),
            "is_active": True
        }
        supabase.table("embed_tokens").insert(embed_data).execute()
        
        # Generate embed codes
        base_url = "http://localhost:8000"  # In production, use your actual domain
        
        iframe_code = f'''<iframe 
    src="{base_url}/embed/widget/{embed_token}" 
    width="400" 
    height="600" 
    frameborder="0"
    style="border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
</iframe>'''
        
        js_code = f'''<div id="chatbot-widget-{embed_token}"></div>
<script>
(function() {{
    const script = document.createElement('script');
    script.src = '{base_url}/embed/widget.js';
    script.onload = function() {{
        window.ChatbotWidget.init({{
            token: '{embed_token}',
            containerId: 'chatbot-widget-{embed_token}',
            apiUrl: '{base_url}'
        }});
    }};
    document.head.appendChild(script);
}})();
</script>'''
        
        return {
            "bot_id": request.bot_id,
            "bot_name": bot.get("name", f"Bot #{request.bot_id[:8]}"),
            "embed_token": embed_token,
            "iframe_code": iframe_code,
            "js_code": js_code,
            "widget_url": f"{base_url}/embed/widget/{embed_token}"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/embed/widget/{embed_token}", response_class=HTMLResponse)
def get_embed_widget(embed_token: str):
    """Serve the embeddable chat widget HTML"""
    try:
        # Verify embed token
        embed_res = supabase.table("embed_tokens").select("*").eq("embed_token", embed_token).eq("is_active", True).execute()
        if not embed_res.data:
            raise HTTPException(status_code=404, detail="Invalid or expired embed token")
        
        embed_data = embed_res.data[0]
        bot_id = embed_data["bot_id"]
        
        # Get bot info
        bot_res = supabase.table("bots").select("*").eq("id", bot_id).execute()
        if not bot_res.data:
            raise HTTPException(status_code=404, detail="Bot not found")
        
        bot = bot_res.data[0]
        bot_name = bot.get("name", f"Bot #{bot_id[:8]}")
        
        html_content = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{bot_name} Chat Widget</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            height: 100vh;
            overflow: hidden;
        }}
        
        .chat-container {{
            display: flex;
            flex-direction: column;
            height: 100vh;
            background: white;
            border-radius: 0;
        }}
        
        .chat-header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px;
            text-align: center;
            font-weight: 600;
            font-size: 16px;
            border-bottom: 2px solid rgba(255,255,255,0.1);
        }}
        
        .chat-messages {{
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            background: #f8fafc;
        }}
        
        .message {{
            margin-bottom: 15px;
            display: flex;
            align-items: flex-start;
            gap: 10px;
        }}
        
        .message.user {{
            flex-direction: row-reverse;
        }}
        
        .message-bubble {{
            max-width: 80%;
            padding: 12px 16px;
            border-radius: 18px;
            word-wrap: break-word;
            line-height: 1.4;
        }}
        
        .message.user .message-bubble {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }}
        
        .message.bot .message-bubble {{
            background: white;
            color: #2d3748;
            border: 1px solid #e2e8f0;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }}
        
        .avatar {{
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            flex-shrink: 0;
        }}
        
        .avatar.user {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }}
        
        .avatar.bot {{
            background: #e2e8f0;
            color: #4a5568;
        }}
        
        .chat-input {{
            padding: 15px;
            background: white;
            border-top: 1px solid #e2e8f0;
        }}
        
        .input-container {{
            display: flex;
            gap: 10px;
            align-items: center;
        }}
        
        .message-input {{
            flex: 1;
            padding: 12px 16px;
            border: 1px solid #e2e8f0;
            border-radius: 25px;
            outline: none;
            font-size: 14px;
            transition: border-color 0.2s;
        }}
        
        .message-input:focus {{
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }}
        
        .send-button {{
            width: 40px;
            height: 40px;
            border: none;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s;
        }}
        
        .send-button:hover {{
            transform: scale(1.05);
        }}
        
        .send-button:disabled {{
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }}
        
        .typing-indicator {{
            display: none;
            padding: 15px;
            font-style: italic;
            color: #64748b;
            font-size: 14px;
        }}
        
        .welcome-message {{
            text-align: center;
            padding: 30px 20px;
            color: #64748b;
        }}
        
        .welcome-message h3 {{
            color: #2d3748;
            margin-bottom: 10px;
        }}
        
        .error-message {{
            background: #fed7d7;
            color: #c53030;
            padding: 10px;
            border-radius: 8px;
            margin: 10px;
            text-align: center;
            font-size: 14px;
        }}
    </style>
</head>
<body>
    <div class="chat-container">
        <div class="chat-header">
            🤖 {bot_name}
        </div>
        
        <div class="chat-messages" id="chatMessages">
            <div class="welcome-message">
                <h3>Welcome to {bot_name}!</h3>
                <p>I'm here to help answer your questions. How can I assist you today?</p>
            </div>
        </div>
        
        <div class="typing-indicator" id="typingIndicator">
            Bot is typing...
        </div>
        
        <div class="chat-input">
            <form class="input-container" id="chatForm">
                <input 
                    type="text" 
                    class="message-input" 
                    id="messageInput" 
                    placeholder="Type your message..."
                    required
                />
                <button type="submit" class="send-button" id="sendButton">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22,2 15,22 11,13 2,9"></polygon>
                    </svg>
                </button>
            </form>
        </div>
    </div>

    <script>
        const API_URL = 'http://localhost:8000';
        const EMBED_TOKEN = '{embed_token}';
        const BOT_ID = '{bot_id}';
        
        const chatMessages = document.getElementById('chatMessages');
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');
        const chatForm = document.getElementById('chatForm');
        const typingIndicator = document.getElementById('typingIndicator');
        
        function addMessage(content, isUser = false) {{
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${{isUser ? 'user' : 'bot'}}`;
            
            messageDiv.innerHTML = `
                <div class="avatar ${{isUser ? 'user' : 'bot'}}">
                    ${{isUser ? '👤' : '🤖'}}
                </div>
                <div class="message-bubble">
                    ${{content}}
                </div>
            `;
            
            chatMessages.appendChild(messageDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }}
        
        function showTyping() {{
            typingIndicator.style.display = 'block';
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }}
        
        function hideTyping() {{
            typingIndicator.style.display = 'none';
        }}
        
        function showError(message) {{
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.textContent = message;
            chatMessages.appendChild(errorDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }}
        
        async function sendMessage(userMessage) {{
            try {{
                showTyping();
                sendButton.disabled = true;
                
                const response = await fetch(`${{API_URL}}/embed/chat`, {{
                    method: 'POST',
                    headers: {{
                        'Content-Type': 'application/json',
                    }},
                    body: JSON.stringify({{
                        bot_id: BOT_ID,
                        user_query: userMessage,
                        embed_token: EMBED_TOKEN
                    }})
                }});
                
                if (!response.ok) {{
                    throw new Error('Failed to get response');
                }}
                
                const data = await response.json();
                hideTyping();
                addMessage(data.answer, false);
                
            }} catch (error) {{
                hideTyping();
                showError('Sorry, I encountered an error. Please try again.');
                console.error('Chat error:', error);
            }} finally {{
                sendButton.disabled = false;
            }}
        }}
        
        chatForm.addEventListener('submit', async (e) => {{
            e.preventDefault();
            
            const message = messageInput.value.trim();
            if (!message) return;
            
            addMessage(message, true);
            messageInput.value = '';
            
            await sendMessage(message);
        }});
        
        messageInput.addEventListener('keypress', (e) => {{
            if (e.key === 'Enter' && !e.shiftKey) {{
                e.preventDefault();
                chatForm.dispatchEvent(new Event('submit'));
            }}
        }});
    </script>
</body>
</html>'''
        
        return HTMLResponse(content=html_content)
        
    except Exception as e:
        error_html = f'''<!DOCTYPE html>
<html><head><title>Error</title></head>
<body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
    <h2>Chat Widget Error</h2>
    <p>Unable to load chat widget: {str(e)}</p>
</body></html>'''
        return HTMLResponse(content=error_html, status_code=500)

@router.post("/embed/chat")
def embed_chat(request: EmbedChatRequest):
    """Handle chat requests from embedded widgets"""
    try:
        # Verify embed token
        embed_res = supabase.table("embed_tokens").select("*").eq("embed_token", request.embed_token).eq("is_active", True).execute()
        if not embed_res.data:
            raise HTTPException(status_code=401, detail="Invalid or expired embed token")
        
        embed_data = embed_res.data[0]
        if embed_data["bot_id"] != request.bot_id:
            raise HTTPException(status_code=401, detail="Bot ID mismatch")
        
        # Use the same chat logic as the main chat endpoint
        # 1. Embed the user query
        query_embedding = get_text_embeddings([request.user_query])[0]

        # 2. Retrieve all embeddings for the bot
        res = supabase.table("embeddings").select("chunk_text,embedding").eq("bot_id", request.bot_id).execute()
        if not res.data or len(res.data) == 0:
            raise HTTPException(status_code=404, detail="No embeddings found for this bot.")

        # 3. Compute cosine similarity (without numpy)
        def cosine_similarity(vec1, vec2):
            """Compute cosine similarity without numpy"""
            dot_product = sum(a * b for a, b in zip(vec1, vec2))
            norm1 = math.sqrt(sum(a * a for a in vec1))
            norm2 = math.sqrt(sum(a * a for a in vec2))
            return dot_product / (norm1 * norm2 + 1e-8)
        
        chunk_texts = []
        similarities = []
        for row in res.data:
            chunk_embedding = row["embedding"]
            sim = cosine_similarity(query_embedding, chunk_embedding)
            similarities.append(sim)
            chunk_texts.append(row["chunk_text"])

        # 4. Select top-k most similar chunks
        top_k = min(request.top_k, len(similarities))
        # Sort by similarity and get top k indices
        indexed_similarities = [(i, sim) for i, sim in enumerate(similarities)]
        indexed_similarities.sort(key=lambda x: x[1], reverse=True)
        top_indices = [i for i, _ in indexed_similarities[:top_k]]
        
        context_chunks = [chunk_texts[i] for i in top_indices]
        context = "\n".join(context_chunks)

        # 5. Send context and user query to Gemini
        prompt = f"Context:\n{context}\n\nUser question: {request.user_query}\nAnswer:"
        gemini = get_gemini_model()
        response = gemini.generate_content(prompt)
        answer = response.text if hasattr(response, 'text') else str(response)

        # 6. Store the conversation in chat_history table
        try:
            timestamp = datetime.utcnow().isoformat()
            
            # Store user message
            user_message = {
                "bot_id": request.bot_id,
                "role": "user",
                "message": request.user_query,
                "created_at": timestamp
            }
            supabase.table("chat_history").insert(user_message).execute()
            
            # Store bot response
            bot_message = {
                "bot_id": request.bot_id,
                "role": "bot",
                "message": answer,
                "created_at": timestamp
            }
            supabase.table("chat_history").insert(bot_message).execute()
        except Exception as e:
            print("Error storing chat history:", e)
            # Don't fail the request if storing history fails
            pass

        return {
            "answer": answer,
            "context_chunks": context_chunks
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/embed/widget.js")
def get_widget_js():
    """Serve the JavaScript widget for embedding"""
    js_content = '''
(function() {
    'use strict';
    
    window.ChatbotWidget = {
        init: function(config) {
            const { token, containerId, apiUrl } = config;
            const container = document.getElementById(containerId);
            
            if (!container) {
                console.error('Chatbot widget container not found:', containerId);
                return;
            }
            
            // Create iframe
            const iframe = document.createElement('iframe');
            iframe.src = `${apiUrl}/embed/widget/${token}`;
            iframe.style.width = '100%';
            iframe.style.height = '600px';
            iframe.style.border = 'none';
            iframe.style.borderRadius = '10px';
            iframe.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            
            container.appendChild(iframe);
        }
    };
})();
'''
    
    return JSONResponse(
        content=js_content,
        media_type="application/javascript",
        headers={
            "Cache-Control": "public, max-age=3600",
            "Content-Type": "application/javascript"
        }
    )

@router.get("/embed/tokens/{bot_id}")
def list_embed_tokens(bot_id: str):
    """List all embed tokens for a bot"""
    try:
        res = supabase.table("embed_tokens").select("*").eq("bot_id", bot_id).order("created_at", desc=True).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/embed/tokens/{embed_token}")
def revoke_embed_token(embed_token: str):
    """Revoke an embed token"""
    try:
        supabase.table("embed_tokens").update({"is_active": False}).eq("embed_token", embed_token).execute()
        return {"message": "Embed token revoked successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 