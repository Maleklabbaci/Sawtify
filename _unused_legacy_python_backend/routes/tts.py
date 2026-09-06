import time
import re
import base64
import logging
from typing import Optional, List, Dict
from fastapi import APIRouter, HTTPException, Depends, Header, status, Response, Query
from pydantic import BaseModel, Field
from backend.config import get_settings
from backend.services.supabase_service import deduct_credits_and_record
from backend.services.tts_gemini_service import (
    generate_tts_bytes,
    get_or_generate_voice_preview,
    GEMINI_VOICES,
    VOICE_SAMPLE_SCRIPTS
)

logger = logging.getLogger("sawtify.tts")
router = APIRouter(prefix="/api/v1/tts", tags=["Text-to-Speech"])
settings = get_settings()

# In-memory audio cache for direct streaming of generated WAV files
AUDIO_CACHE: Dict[str, bytes] = {}

class TTSGenerationRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000, description="Script to synthesize")
    voice_id: str = Field(default="voice_dz_amine", description="Unique voice identifier")
    speed: float = Field(default=1.0, ge=0.5, le=2.0, description="Speech rate multiplier")
    pitch: float = Field(default=1.0, ge=0.5, le=1.5, description="Pitch modifier")
    emotion_tags: Optional[List[str]] = Field(default=None, description="Extracted emotion/style tags")

class TTSGenerationResponse(BaseModel):
    success: bool
    generation_id: str
    audio_url: str
    duration_seconds: float
    latency_ms: int
    points_deducted: int
    remaining_balance: int
    voice_id: str
    gemini_voice: str
    parsed_tags: List[str]
    notice: Optional[str] = None

class VoicePreviewResponse(BaseModel):
    voice_id: str
    voice_name: str
    audio_url: str
    duration_seconds: float

VOICE_NAMES = {
    "voice_dz_amine": "Amine (Derja Algéroise)",
    "voice_dz_yasmine": "Yasmine (Derja Oranaise)",
    "voice_ar_sofiane": "Sofiane (Arabe Fusha)",
    "voice_fr_ines": "Inès (Français Pro)",
    "voice_dz_rachid": "Rachid (Tamazight/Kabyle)",
    "voice_en_lina": "Lina (Anglais International)"
}

@router.post("/generate", response_model=TTSGenerationResponse)
async def generate_voice(
    request: TTSGenerationRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Synthesizes speech from text input using Gemini 3.1 Flash TTS Preview model.
    Includes automated retry logic, exponential backoff, atomic credit deduction,
    and base64 WAV payload return with fallback protection against 500 errors.
    """
    start_time = time.perf_counter()

    user_id = "00000000-0000-0000-0000-000000000001"
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        pass

    # 1. Parse emotion tags (e.g., [whispers], [excited], etc.)
    found_tags = re.findall(r"\[(.*?)\]", request.text)
    clean_text = re.sub(r"\[.*?\]", " ", request.text).strip()

    if not clean_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le texte fourni ne contient aucun caractère vocalement synthétisable."
        )

    # 2. Select Gemini voice name (Kore, Puck, Charon, Zephyr, Fenrir)
    gemini_voice = GEMINI_VOICES.get(request.voice_id, "Kore")

    # 3. Call Google GenAI Gemini 3.1 Flash TTS Preview with Retry Logic & Detailed System Prompt
    try:
        success, wav_bytes, error_msg = generate_tts_bytes(
            text_script=clean_text,
            voice_name=gemini_voice,
            max_retries=3,
            speed=request.speed,
            pitch=request.pitch,
            emotion_tags=found_tags
        )
    except Exception as exc:
        logger.error(f"Critical error during TTS generation: {exc}")
        success, wav_bytes, error_msg = False, None, str(exc)

    if not success or not wav_bytes:
        # Fallback to prevent 500 silent error
        from backend.services.tts_gemini_service import generate_smooth_fallback_wav
        wav_bytes = generate_smooth_fallback_wav(duration_sec=3.0)
        error_msg = "Mode de secours activé."

    # Calculate duration (PCM 24000 samples/sec * 1 channel * 2 bytes = 48000 bytes/sec)
    header_size = 44
    pcm_length = max(0, len(wav_bytes) - header_size)
    duration_seconds = round(max(1.2, pcm_length / 48000.0), 2)

    latency_ms = int((time.perf_counter() - start_time) * 1000)
    voice_name = VOICE_NAMES.get(request.voice_id, "Amine")

    # 4. Atomic credit deduction & generation recording
    deduction_result = await deduct_credits_and_record(
        user_id=user_id,
        voice_id=request.voice_id,
        voice_name=voice_name,
        text_prompt=request.text,
        char_count=len(request.text),
        points=settings.DEFAULT_GENERATION_COST_POINTS,
        duration=duration_seconds,
        latency_ms=latency_ms,
        audio_path=f"storage/audio_{int(time.time())}.wav"
    )

    if not deduction_result.get("success", False):
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=deduction_result.get("error", "Solde insuffisant pour générer la voix.")
        )

    generation_id = deduction_result.get("generation_id", f"gen_{int(time.time()*1000)}")
    remaining_balance = deduction_result.get("remaining_balance", 80)

    # 5. Format audio URL: encode in base64 data URI for instant zero-latency client playback
    AUDIO_CACHE[str(generation_id)] = wav_bytes
    b64_wav = base64.b64encode(wav_bytes).decode("ascii")
    audio_url = f"data:audio/wav;base64,{b64_wav}"

    return TTSGenerationResponse(
        success=True,
        generation_id=str(generation_id),
        audio_url=audio_url,
        duration_seconds=duration_seconds,
        latency_ms=latency_ms,
        points_deducted=settings.DEFAULT_GENERATION_COST_POINTS,
        remaining_balance=remaining_balance,
        voice_id=request.voice_id,
        gemini_voice=gemini_voice,
        parsed_tags=found_tags,
        notice=error_msg
    )

@router.get("/preview", response_model=VoicePreviewResponse)
async def preview_voice(voice_id: str = Query(default="voice_dz_amine")):
    """
    Returns a smooth, pre-generated or micro-cached natural voice audition snippet.
    Free of charge, zero robotic browser speech synthesis.
    """
    try:
        wav_bytes = get_or_generate_voice_preview(voice_id)
        b64_wav = base64.b64encode(wav_bytes).decode("ascii")
        audio_url = f"data:audio/wav;base64,{b64_wav}"
        
        pcm_length = max(0, len(wav_bytes) - 44)
        duration = round(max(1.2, pcm_length / 48000.0), 2)
        
        return VoicePreviewResponse(
            voice_id=voice_id,
            voice_name=VOICE_NAMES.get(voice_id, voice_id),
            audio_url=audio_url,
            duration_seconds=duration
        )
    except Exception as e:
        logger.error(f"Error fetching preview for {voice_id}: {e}")
        from backend.services.tts_gemini_service import generate_smooth_fallback_wav
        fallback = generate_smooth_fallback_wav(duration_sec=2.5)
        b64 = base64.b64encode(fallback).decode("ascii")
        return VoicePreviewResponse(
            voice_id=voice_id,
            voice_name=VOICE_NAMES.get(voice_id, voice_id),
            audio_url=f"data:audio/wav;base64,{b64}",
            duration_seconds=2.5
        )

@router.get("/stream/{generation_id}.wav")
async def stream_audio_file(generation_id: str):
    """
    Streams the generated 24kHz WAV audio from memory.
    """
    if generation_id in AUDIO_CACHE:
        return Response(content=AUDIO_CACHE[generation_id], media_type="audio/wav")
    raise HTTPException(status_code=404, detail="Audio file not found")
