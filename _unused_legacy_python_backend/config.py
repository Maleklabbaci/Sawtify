import os
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    APP_NAME: str = "Sawtify TTS API"
    ENVIRONMENT: str = "production"
    DEBUG: bool = False
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # Supabase Credentials
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "https://your-project.supabase.co")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "your-supabase-service-key")

    # Gemini TTS API Key
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

    # Payment Gateway Secrets (SlickPay / SATIM CIB & Edahabia)
    WEBHOOK_SECRET_KEY: str = os.getenv("WEBHOOK_SECRET_KEY", "")
    SLICKPAY_PUBLIC_KEY: str = os.getenv("SLICKPAY_PUBLIC_KEY", "")

    # TTS Pricing Rules
    DEFAULT_GENERATION_COST_POINTS: int = 20

    class Config:
        env_file = ".env"
        case_sensitive = True

@lru_cache()
def get_settings() -> Settings:
    return Settings()
