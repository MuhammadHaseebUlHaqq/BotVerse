import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Create the FastAPI app
app = FastAPI(title="Botverse API", version="1.0.2")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for now
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Botverse API is running", "version": "1.0.2"}

@app.get("/api/health")
def health_check():
    return {
        "status": "ok", 
        "environment": os.getenv("ENVIRONMENT", "development"),
        "version": "1.0.2"
    }

@app.get("/api/test")
def test_endpoint():
    return {
        "message": "Test endpoint working",
        "supabase_url": "set" if os.getenv("SUPABASE_URL") else "missing",
        "gemini_api": "set" if os.getenv("GEMINI_API_KEY") else "missing"
    }

# Simple test endpoints to verify basic functionality
@app.get("/api/bots")
def list_bots():
    return {"message": "Bots endpoint working", "bots": []}

@app.post("/api/upload")
def upload_test():
    return {"message": "Upload endpoint reachable", "status": "test"}

# For Vercel serverless functions
from mangum import Mangum
handler = Mangum(app) 