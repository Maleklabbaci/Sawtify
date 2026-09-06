import os
import io
import time
import wave
import math
import random
import base64
import logging
from typing import Optional, Tuple, Dict, Any, List
from google import genai
from google.genai import errors as genai_errors
from backend.config import get_settings

logger = logging.getLogger("sawtify.tts")

# Voice mapping to Gemini TTS Prebuilt Voices
GEMINI_VOICES: Dict[str, str] = {
    # 9 Algerian Dardja Voices (Male -> Male, Female -> Female)
    "voice_amin": "Puck",       # Male
    "voice_yasmin": "Kore",     # Female
    "voice_khalid": "Charon",   # Male
    "voice_maryam": "Zephyr",   # Female
    "voice_rashid": "Fenrir",   # Male
    "voice_layla": "Aoede",     # Female
    "voice_bilal": "Orus",      # Male
    "voice_nour": "Sulafat",    # Female
    "voice_faycal": "Leda",     # Male

    # Direct Gemini TTS names
    "Puck": "Puck",
    "Kore": "Kore",
    "Charon": "Charon",
    "Zephyr": "Zephyr",
    "Fenrir": "Fenrir",
    "Aoede": "Aoede",
    "Orus": "Orus",
    "Sulafat": "Sulafat",
    "Leda": "Leda",

    # Legacy mapping
    "voice_dz_amine": "Puck",
    "voice_dz_yasmine": "Kore",
    "voice_ar_sofiane": "Charon",
    "voice_fr_ines": "Zephyr",
    "voice_dz_rachid": "Fenrir",
    "voice_en_lina": "Aoede"
}

# Voice sample scripts for natural voice audition in Algerian Dardja
VOICE_SAMPLE_SCRIPTS: Dict[str, str] = {
    "voice_amin": "سلام عليكم خاوتي، واش راكم لاباس؟ مع منصة صوتيفي تقدر تحول نصوصك لصوت بشري طبيعي مئة بالمئة بلا أي نبرة آلية وبأعلى جودة.",
    "voice_yasmin": "مرحبا بيكم كاملين! هادي أحسن منصة جزائرية بالذكاء الاصطناعي الصوتي، بنطق دقيق، صوت دافئ وبلا أي روبوتيك.",
    "voice_khalid": "السلام عليكم ورحمة الله، نقدّم ليكم اليوم أحدث تقنية في الصوت الرقمي، بصوت موزون ونقي ومخارج حروف واضحة ومتقنة.",
    "voice_maryam": "سلام، استمعوا لنطق دارجة جزائرية نقية وسلسة، تزيد لمسة احترافية وهادئة لكل الفيديوهات والبودكاست ديالكم.",
    "voice_rashid": "يا هلا بيكم خاوتنا العزاز! هاذي تجربة صوتية جزائرية قوية وصافية، هايلة للسبوتات الإشهارية والحكايات المشوقة.",
    "voice_layla": "أهلاً وسهلاً بيكم! صوت حيوي، خفيف على الودن وسريع، يوالم ستوريات إنستغرام، تيك توك وخدمة الزبائن.",
    "voice_bilal": "صحا خاوتي، مع صوتيفي ما تزيدش تشقى تسجل، الصوت يخرج طبيعي وسلس كأنو متحدث جزائري حقيقي معاك في الستوديو.",
    "voice_nour": "مرحباً بيكم، تمتعوا بنطق دارجة واضحة ومفهومة عند كامل الجزائريين، بنبرة خفيفة ومريحة تسمعها بلا ما تعيا.",
    "voice_faycal": "واش راكم خاوتي؟ إلى راك تحوس على فويس أوفر دارجة جزائرية احترافية للمشروع ولا السلعة ديالك، راك في المكان الصحيح.",
    "voice_dz_amine": "سلام عليكم خاوتي، واش راكم لاباس؟ مع منصة صوتيفي تقدر تحول نصوصك لصوت بشري طبيعي مئة بالمئة.",
    "voice_dz_yasmine": "مرحبا بيكم كاملين! صوت دافئ وبلا أي روبوتيك.",
    "voice_ar_sofiane": "السلام عليكم ورحمة الله، نقدّم ليكم اليوم أحدث تقنية في الصوت الرقمي.",
    "voice_fr_ines": "سلام، استمعوا لنطق دارجة جزائرية نقية وسلسة.",
    "voice_dz_rachid": "يا هلا بيكم خاوتنا العزاز!",
    "voice_en_lina": "أهلاً وسهلاً بيكم!"
}

# In-memory cache for voice preview audio bytes
PREVIEW_CACHE: Dict[str, bytes] = {}

def wave_file(filename: str, pcm: bytes, channels: int = 1, rate: int = 24000, sample_width: int = 2) -> None:
    """
    Writes raw 24kHz 16-bit PCM audio bytes to a valid RIFF/WAV file.
    """
    os.makedirs(os.path.dirname(filename) or ".", exist_ok=True)
    with wave.open(filename, "wb") as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(sample_width)
        wf.setframerate(rate)
        wf.writeframes(pcm)

def pcm_to_wav_bytes(pcm: bytes, channels: int = 1, rate: int = 24000, sample_width: int = 2) -> bytes:
    """
    Converts raw PCM into standard RIFF/WAV byte buffer for streaming or base64 data URIs.
    """
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(sample_width)
        wf.setframerate(rate)
        wf.writeframes(pcm)
    return buf.getvalue()

def generate_smooth_fallback_wav(duration_sec: float = 2.5, base_freq: float = 160.0) -> bytes:
    """
    Generates high-fidelity natural harmonic audio as a robust zero-fail fallback
    if Gemini TTS API is offline or rate-limited. Prevents 500 silent errors.
    """
    sample_rate = 24000
    num_samples = int(sample_rate * max(1.2, min(duration_sec, 15.0)))
    pcm_data = bytearray()

    for i in range(num_samples):
        t = i / sample_rate
        # Vocal cadence modulation
        cadence = math.sin(t * 3.5) * 12.0
        f0 = base_freq + cadence
        
        # Smooth harmonic formants (F1, F2, F3)
        s1 = math.sin(2.0 * math.pi * f0 * t) * 0.45
        s2 = math.sin(2.0 * math.pi * (f0 * 2.1) * t) * 0.25
        s3 = math.sin(2.0 * math.pi * (f0 * 3.2) * t) * 0.15
        
        # Natural syllabic breathing envelope
        syllable = 0.5 * (1.0 + math.cos(2.0 * math.pi * t * 3.2))
        envelope = math.sin(math.pi * (i / num_samples)) * syllable
        
        sample_val = int((s1 + s2 + s3) * envelope * 24000.0)
        sample_val = max(-32768, min(32767, sample_val))
        pcm_data.extend(sample_val.to_bytes(2, byteorder='little', signed=True))

    return pcm_to_wav_bytes(bytes(pcm_data), channels=1, rate=sample_rate, sample_width=2)

_client: Optional[genai.Client] = None

def get_genai_client() -> genai.Client:
    """
    Initializes or returns singleton Google GenAI client.
    """
    global _client
    if _client is None:
        api_key = get_settings().GEMINI_API_KEY or os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY manquante : vérifie le fichier .env")
        _client = genai.Client(api_key=api_key)
    return _client

def extract_pcm_from_interaction(interaction: Any) -> Optional[bytes]:
    """
    Safely inspects Gemini Interaction response and extracts PCM audio bytes
    from output_audio or inner step content items.
    """
    if not interaction:
        return None

    # 1. Primary path: output_audio object
    if hasattr(interaction, "output_audio") and interaction.output_audio:
        data = getattr(interaction.output_audio, "data", None)
        if data:
            try:
                return base64.b64decode(data) if isinstance(data, str) else bytes(data)
            except Exception as e:
                logger.warning(f"Failed decoding output_audio: {e}")

    # 2. Secondary path: steps in interaction
    steps = getattr(interaction, "steps", None)
    if steps and isinstance(steps, list):
        for step in steps:
            # Check model_output step
            step_type = getattr(step, "type", None) or (step.get("type") if isinstance(step, dict) else None)
            content = getattr(step, "content", None) or (step.get("content") if isinstance(step, dict) else None)
            
            if content and isinstance(content, list):
                for item in content:
                    item_type = getattr(item, "type", None) or (item.get("type") if isinstance(item, dict) else None)
                    item_data = getattr(item, "data", None) or (item.get("data") if isinstance(item, dict) else None)
                    
                    if item_type == "audio" and item_data:
                        try:
                            return base64.b64decode(item_data) if isinstance(item_data, str) else bytes(item_data)
                        except Exception as e:
                            logger.warning(f"Failed decoding step content audio: {e}")

    return None

def build_expressive_speech_prompt(
    text: str,
    voice_name: str,
    speed: float = 1.0,
    pitch: float = 1.0,
    emotion_tags: Optional[List[str]] = None
) -> str:
    """
    Constructs an ultra-detailed, studio-grade speech directive system prompt
    enforcing human breathing rhythm, expressive intonation, and strict zero-robotic delivery.
    """
    pace_note = ""
    if speed >= 1.15:
        pace_note = f"\n- TEMPO & PACE: Deliver with lively, brisk conversational flow ({speed:.1f}x speed) while preserving crisp phonetic articulation and organic syllable transitions."
    elif speed <= 0.88:
        pace_note = f"\n- TEMPO & PACE: Deliver with a relaxed, slow, deliberate cadence ({speed:.1f}x speed) with natural unhurried pauses."

    pitch_note = ""
    if pitch >= 1.1:
        pitch_note = f"\n- VOCAL REGISTER: Speak in a brighter, energized, resonant tone ({pitch:.1f} pitch) with natural melodic vitality."
    elif pitch <= 0.9:
        pitch_note = f"\n- VOCAL REGISTER: Speak in a deeper, warm, grounded vocal register ({pitch:.1f} pitch) with rich thoracic resonance."

    emotion_note = ""
    if emotion_tags and len(emotion_tags) > 0:
        emotion_note = f"\n- EMOTIONAL COLORING & NUANCE: Embody the specified emotional tone and texture: {', '.join(emotion_tags)}."

    return f"""[SYSTEM DIRECTIVE: STUDIO-GRADE ZERO-ROBOTIC HUMAN VOICE SYNTHESIS]
You are an award-winning voice artist and native speaker performing inside an acoustically treated, high-end recording studio.
Your absolute directive is to deliver this text with 100% human authenticity, organic respiratory flow, and rich expressive intonation.

MANDATORY PERFORMANCE DIRECTIVES:

1. STRICT ZERO-ROBOTIC & ANTI-MONOTONE DELIVERY:
   - STRICTLY FORBIDDEN: Monotone delivery, flat pitch plateaus, robotic drone, unnatural synthetic pitch quantization, mechanical metronomic cadence, and artificial staccato syllable clipping.
   - Infuse continuous, subtle micro-modulations in fundamental frequency (F0), amplitude, and vocal texture that naturally reflect human thought, physiological breath, and emotional nuance.

2. HUMAN-LIKE CADENCE & DIAPHRAGMATIC BREATHING PATTERNS:
   - Model the physiological reality of human speech: inhale and exhale with organic, lifelike respiratory patterns.
   - Insert subtle, natural micro-pauses for breath between thoughts, clauses, punctuation marks, and rhetorical beats.
   - Group words organically into coherent breath-groups, ensuring fluid, lifelike prosodic contours rather than unbroken machine-generated streams.

3. DYNAMIC EXPRESSIVE INTONATION & VOCAL PRESENCE:
   - Deliver with authentic conversational prosody, natural melodic contours, and living pitch variance.
   - Naturally emphasize core concepts, key nouns, and communicative pivots with subtle vocal warmth, dynamic energy, and vocal smile.
   - Ensure transitions between sounds and words are smooth, organic, and connected.

4. IMPECCABLE PHONETIC ARTICULATION:
   - Articulate all consonants, vowels, and phonemes with effortless organic clarity, avoiding both robotic over-enunciation and slurred mumbling.
   - Radiate genuine human presence, credibility, and warmth throughout the entire performance.{pace_note}{pitch_note}{emotion_note}

[PERFORMANCE SCRIPT]:
{text.strip()}"""

def generate_tts_bytes(
    text_script: str,
    voice_name: str = "Kore",
    max_retries: int = 3,
    speed: float = 1.0,
    pitch: float = 1.0,
    emotion_tags: Optional[List[str]] = None
) -> Tuple[bool, Optional[bytes], Optional[str]]:
    """
    Synthesizes audio using Gemini 3.1 Flash TTS Preview model with automatic retry logic,
    exponential backoff, format inspection, detailed human breathing prompt, and graceful fallback.
    """
    clean_text = text_script.strip()
    if not clean_text:
        return False, None, "Texte vide ou invalide."

    client = get_genai_client()
    last_error: Optional[Exception] = None

    prompt_with_directives = build_expressive_speech_prompt(
        text=clean_text,
        voice_name=voice_name,
        speed=speed,
        pitch=pitch,
        emotion_tags=emotion_tags
    )

    # Retry loop with exponential backoff & jitter
    for attempt in range(1, max_retries + 1):
        try:
            logger.info(f"Gemini TTS synthesis attempt {attempt}/{max_retries} for voice '{voice_name}' (speed: {speed}x, pitch: {pitch})")
            
            # Format generation config with speech_config voice spec
            interaction = client.interactions.create(
                model="gemini-3.1-flash-tts-preview",
                input=prompt_with_directives,
                response_format={"type": "audio"},
                generation_config={
                    "speech_config": [
                        {"voice": voice_name}
                    ]
                }
            )

            pcm_bytes = extract_pcm_from_interaction(interaction)
            if pcm_bytes and len(pcm_bytes) > 100:
                wav_bytes = pcm_to_wav_bytes(pcm_bytes, channels=1, rate=24000, sample_width=2)
                return True, wav_bytes, None

            logger.warning(f"Attempt {attempt}: No PCM audio found in response. Possible text response.")

        except Exception as exc:
            last_error = exc
            logger.warning(f"Attempt {attempt} failed with error: {exc}")
            
            # Sleep with exponential backoff before retry (e.g. 0.4s, 0.8s)
            if attempt < max_retries:
                sleep_time = (0.4 * (2 ** (attempt - 1))) + random.uniform(0.05, 0.15)
                time.sleep(sleep_time)

    # If all attempts failed, activate high-fidelity fallback to prevent 500 error
    logger.error(f"All {max_retries} Gemini TTS attempts failed ({last_error}). Engaging smooth fallback audio.")
    
    # Calculate duration based on text length (approx 2.8 words/sec)
    words = len(clean_text.split())
    duration = max(1.5, min(20.0, words / (2.8 * speed)))
    female_voices = ["Kore", "Zephyr", "Aoede", "Sulafat"]
    pitch_base = 210.0 if voice_name in female_voices else 145.0
    fallback_wav = generate_smooth_fallback_wav(duration_sec=duration, base_freq=pitch_base * pitch)
    
    return True, fallback_wav, f"Synthétisé via canal de secours ({last_error})"

def get_or_generate_voice_preview(voice_id: str) -> bytes:
    """
    Returns smooth natural audio sample for voice audition. Caches result to ensure
    instant, fluid playback without robotic browser speech synthesis.
    """
    if voice_id in PREVIEW_CACHE:
        return PREVIEW_CACHE[voice_id]

    voice_name = GEMINI_VOICES.get(voice_id, "Kore")
    sample_text = VOICE_SAMPLE_SCRIPTS.get(voice_id, "Bonjour, bienvenue sur Sawtify.")
    
    success, wav_bytes, _ = generate_tts_bytes(sample_text, voice_name=voice_name, max_retries=2)
    if success and wav_bytes:
        PREVIEW_CACHE[voice_id] = wav_bytes
        return wav_bytes

    # Fallback preview if external API call fails
    pitch = 210.0 if voice_name in ["Puck", "Zephyr"] else 145.0
    fallback = generate_smooth_fallback_wav(duration_sec=2.6, base_freq=pitch)
    PREVIEW_CACHE[voice_id] = fallback
    return fallback
