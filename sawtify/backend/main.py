from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routes import tts, webhooks

app = FastAPI(
    title="Sawtify TTS API",
    description="Backend FastAPI complet avec Google Gemini 3.1 Flash TTS Preview",
    version="1.2.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes TTS (génération, aperçu, streaming) + déduction de points Supabase
app.include_router(tts.router)

# Webhooks paiement (SlickPay / SATIM / Edahabia) -> crédite les points
app.include_router(webhooks.router)


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "sawtify-fastapi-gemini-tts"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
