import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.bots import router as bots_router
from app.api.upload import router as upload_router
from app.api.scrape import router as scrape_router
from app.api.chat import router as chat_router
from app.api.embed import router as embed_router

app = FastAPI(title="Botverse API", version="1.0.0")

# Configure CORS based on environment
if os.getenv("ENVIRONMENT") == "production":
    # Production CORS - replace with your actual domain
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["https://your-domain.vercel.app"],  # Update this with your actual domain
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["*"],
    )
else:
    # Development CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(bots_router, prefix="/api")
app.include_router(upload_router, prefix="/api")
app.include_router(scrape_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(embed_router, prefix="/api")

@app.get("/api/health")
def health_check():
    return {"status": "ok", "environment": os.getenv("ENVIRONMENT", "development")}

# For Vercel serverless functions
def handler(event, context):
    return app 