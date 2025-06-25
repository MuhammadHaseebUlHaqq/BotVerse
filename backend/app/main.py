from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.bots import router as bots_router
from app.api.upload import router as upload_router
from app.api.scrape import router as scrape_router
from app.api.chat import router as chat_router
from app.api.embed import router as embed_router

app = FastAPI()

# Enable CORS for all origins (for development)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(bots_router)
app.include_router(upload_router)
app.include_router(scrape_router)
app.include_router(chat_router)
app.include_router(embed_router)

@app.get("/health")
def health_check():
    return {"status": "ok"} 