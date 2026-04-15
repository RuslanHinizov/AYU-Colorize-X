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

    # Admin credentials (for init_db.py)
    ADMIN_EMAIL: str = ""
    ADMIN_PASSWORD: str = ""

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174,http://127.0.0.1:3000"

    class Config:
        env_file = ".env"

settings = Settings()

# If SECRET_KEY is empty or the insecure default, generate a random one
if not settings.SECRET_KEY or settings.SECRET_KEY == "your-secret-key-change-me":
    settings.SECRET_KEY = _generate_secret_key()

# Validate critical settings
_is_production = os.getenv("ENVIRONMENT", "development") == "production"
if _is_production and not settings.STRIPE_WEBHOOK_SECRET:
    warnings.warn(
        "STRIPE_WEBHOOK_SECRET is not set! Webhook endpoint will reject all requests in production.",
        RuntimeWarning,
    )
