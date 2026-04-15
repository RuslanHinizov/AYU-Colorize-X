# Apply torch.load patch - force CPU when CUDA not available
import torch
import torch.serialization

# Safe patch for torch.serialization (version-compatible)
try:
    if hasattr(torch.serialization, '_validate_device'):
        _original_validate_device = torch.serialization._validate_device

        def _patched_validate_device(location, backend_name):
            """Force CPU when CUDA not available"""
            if not torch.cuda.is_available():
                return torch.device('cpu')
            return _original_validate_device(location, backend_name)

        torch.serialization._validate_device = _patched_validate_device
except Exception:
    pass  # Ignore if patch fails - newer PyTorch versions handle this differently


# Apply FastAI monkey patches for DeOldify compatibility
try:
    from patch_fastai import apply_fastai_patch
    apply_fastai_patch()
except ImportError:
    pass

from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from config import settings
from database import engine, Base
from routers import auth, jobs, admin, payments, websocket
import os

# Create media directories
os.makedirs("media/uploads", exist_ok=True)
os.makedirs("media/outputs", exist_ok=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown: Clean up resources
    await engine.dispose()

app = FastAPI(
    title="AYU ColorizeX API",
    version="1.0.0",
    description="AI-powered image colorization and restoration platform",
    lifespan=lifespan
)

CORS_ORIGINS = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# Maintenance Mode Middleware - registered BEFORE routers
MAINTENANCE_ALLOWED_PREFIXES = (
    "/api/auth/login", "/api/auth/register", "/api/auth/system-info",
    "/api/admin", "/media/", "/health", "/docs", "/openapi.json",
)
MAINTENANCE_ALLOWED_EXACT = ("/", "/health")


@app.middleware("http")
async def maintenance_mode_check(request: Request, call_next):
    """Block non-admin API requests when maintenance mode is active"""
    from app_state import app_settings as _settings

    if _settings.get("maintenance_mode", False):
        path = request.url.path

        # Allow exact paths
        if path in MAINTENANCE_ALLOWED_EXACT:
            return await call_next(request)

        # Allow whitelisted prefix paths
        for prefix in MAINTENANCE_ALLOWED_PREFIXES:
            if path.startswith(prefix):
                return await call_next(request)

        # Check if the user is an admin via Bearer token
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            try:
                from services import decode_access_token
                from database import SessionLocal
                from sqlalchemy import select
                from models import User, UserRole

                token = auth_header.split(" ")[1]
                payload = decode_access_token(token)
                if payload:
                    email = payload.get("sub")
                    async with SessionLocal() as session:
                        result = await session.execute(
                            select(User).where(User.email == email)
                        )
                        user = result.scalar_one_or_none()
                        if user and user.role == UserRole.ADMIN:
                            return await call_next(request)
            except Exception:
                pass

        return JSONResponse(
            status_code=503,
            content={"detail": "Sistem bakım modunda. Lütfen daha sonra tekrar deneyin."}
        )

    return await call_next(request)


# Include routers
app.include_router(auth.router)
app.include_router(jobs.router)
app.include_router(admin.router)
app.include_router(payments.router)
app.include_router(websocket.router)

# Serve static files (processed images)
app.mount("/media", StaticFiles(directory="media"), name="media")

@app.get("/")
async def root():
    return {
        "message": "Welcome to AYU ColorizeX API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {"status": "ok"}
