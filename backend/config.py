import os
import secrets
import warnings
from pydantic_settings import BaseSettings


def _generate_secret_key() -> str:
    """Generate a secure random key and warn that it should be set in .env"""
    warnings.warn(
        "SECRET_KEY is not set in .env! A random key has been generated. "
        "JWT tokens will be invalidated on every restart. "
        "Set SECRET_KEY in your .env file for production use.",
        RuntimeWarning,
        stacklevel=2
    )
    return secrets.token_urlsafe(64)


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/ayu_db"
    REDIS_URL: str = "redis://localhost:6379/0"
    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Stripe Settings
    STRIPE_SECRET_KEY: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""

    # Gemini image editing
    GEMINI_API_KEY: str = ""
    GEMINI_IMAGE_MODEL: str = "gemini-2.5-flash-image"

    # Local image enhancement providers
    # FACE_RESTORE_PROVIDER: vqfr | codeformer | gemini
    # UPSCALE_PROVIDER: pisasr | realesrgan | gemini
    FACE_RESTORE_PROVIDER: str = "vqfr"
    UPSCALE_PROVIDER: str = "pisasr"
    LOCAL_ENHANCE_ALLOW_FALLBACK: bool = True

    VQFR_REPO_DIR: str = "external_repos/VQFR"
    VQFR_MODEL_VERSION: str = "1.0"
    VQFR_MODEL_PATH: str = "external_repos/VQFR/experiments/pretrained_models/VQFR_v1-33a1fac5.pth"
    VQFR_FIDELITY_RATIO: float = 0.0
    VQFR_UPSCALE: int = 2
    VQFR_TIMEOUT_SECONDS: int = 300

    PISASR_REPO_DIR: str = "external_repos/PiSA-SR"
    PISASR_PYTHON: str = ""
    PISASR_SD21_PATH: str = "external_repos/PiSA-SR/preset/models/stable-diffusion-2-1-base"
    PISASR_MODEL_PATH: str = "external_repos/PiSA-SR/preset/models/pisa_sr.pkl"
    PISASR_PROCESS_SIZE: int = 512
    PISASR_UPSCALE: int = 4
    PISASR_TIMEOUT_SECONDS: int = 900

    # AI models directory — override for worktree/Docker deployments
    AI_MODELS_DIR: str = ""

    # Admin credentials (for init_db.py)
    ADMIN_EMAIL: str = ""
    ADMIN_PASSWORD: str = ""

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174,http://127.0.0.1:3000"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

# If SECRET_KEY is empty or the insecure default, generate a random one
_is_production = os.getenv("ENVIRONMENT", "development") == "production"
if not settings.SECRET_KEY or settings.SECRET_KEY == "your-secret-key-change-me":
    if _is_production:
        raise RuntimeError("SECRET_KEY must be set to a strong non-default value in production")
    settings.SECRET_KEY = _generate_secret_key()

# Validate critical settings
if _is_production and not settings.STRIPE_WEBHOOK_SECRET:
    warnings.warn(
        "STRIPE_WEBHOOK_SECRET is not set! Webhook endpoint will reject all requests in production.",
        RuntimeWarning,
    )
