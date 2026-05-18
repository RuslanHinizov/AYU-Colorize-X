from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from database import get_db
from models import User, UserRole
from services import (
    verify_password,
    get_password_hash,
    is_student_email,
    create_access_token,
    decode_access_token
)
import time

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# Simple in-memory rate limiter (suitable for single-worker dev; use Redis-based
# throttling when running multiple workers in production)
_rate_limit_store: dict = {}
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX = 10  # max attempts per window
# Prune the store when it grows beyond this size to prevent unbounded memory growth
_RATE_LIMIT_MAX_IPS = 10_000

def check_rate_limit(ip: str):
    """Check if IP has exceeded rate limit"""
    now = time.time()
    cutoff = now - RATE_LIMIT_WINDOW

    # Prune expired entries for this IP
    if ip in _rate_limit_store:
        _rate_limit_store[ip] = [t for t in _rate_limit_store[ip] if t > cutoff]
    else:
        _rate_limit_store[ip] = []

    if len(_rate_limit_store[ip]) >= RATE_LIMIT_MAX:
        raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")

    _rate_limit_store[ip].append(now)

    # Prune entire store if it grows too large (evict IPs with no recent activity)
    if len(_rate_limit_store) > _RATE_LIMIT_MAX_IPS:
        stale = [k for k, v in _rate_limit_store.items() if not v or max(v) < cutoff]
        for k in stale:
            del _rate_limit_store[k]


# ─── Initial credit grants ────────────────────────────────────────────────────
_STUDENT_CREDITS = 100
_USER_CREDITS = 10


def user_to_dict(user: "User") -> dict:
    """Serialise a User ORM object to the standard auth response dict."""
    return {
        "id": str(user.id),
        "email": user.email,
        "role": user.role.value,
        "credits": user.credits,
        "is_active": user.is_active,
    }


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str

    @field_validator('password')
    @classmethod
    def validate_password_length(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if len(v) > 128:
            raise ValueError('Password must not exceed 128 characters')
        return v

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict

class UserResponse(BaseModel):
    id: str
    email: str
    role: str
    credits: int
    is_active: bool

@router.post("/register", response_model=LoginResponse)
async def register(request: RegisterRequest, req: Request, db: AsyncSession = Depends(get_db)):
    """Register a new user"""
    check_rate_limit(req.client.host)
    # Check if user already exists
    result = await db.execute(select(User).where(User.email == request.email))
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Determine user role based on email
    role = UserRole.STUDENT if is_student_email(request.email) else UserRole.USER
    credits = _STUDENT_CREDITS if role == UserRole.STUDENT else _USER_CREDITS
    
    # Create new user
    new_user = User(
        email=request.email,
        password_hash=get_password_hash(request.password),
        role=role,
        credits=credits
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    # Create access token
    access_token = create_access_token(data={"sub": request.email, "user_id": str(new_user.id)})
    
    return {"access_token": access_token, "token_type": "bearer", "user": user_to_dict(new_user)}


@router.post("/login", response_model=LoginResponse)
async def login(req: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    """Login user and return JWT token"""
    check_rate_limit(req.client.host)
    # Find user by email
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )
    
    # Create access token
    access_token = create_access_token(data={"sub": user.email, "user_id": str(user.id)})
    
    return {"access_token": access_token, "token_type": "bearer", "user": user_to_dict(user)}


async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User:
    """Get current authenticated user"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    
    email: str = payload.get("sub")
    if email is None:
        raise credentials_exception
    
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
    
    return user

@router.post("/logout")
async def logout(token: str = Depends(oauth2_scheme)):
    """Logout and invalidate the current token"""
    from services.auth_service import blacklist_token
    blacklist_token(token)
    return {"message": "Logged out successfully"}

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return user_to_dict(current_user)

class UpgradeRequest(BaseModel):
    role: str

@router.post("/demo-upgrade")
async def demo_upgrade(
    request: UpgradeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upgrade user role (ADMIN ONLY)"""
    # Only admins can use this endpoint
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can use this endpoint"
        )

    try:
        new_role = UserRole(request.role.upper())
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid role")

    # Prevent setting ADMIN role via this endpoint
    if new_role == UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot assign ADMIN role via this endpoint"
        )

    current_user.role = new_role

    # Add credits for Pro
    if new_role == UserRole.PRO:
        current_user.credits += 100

    await db.commit()

    return {"message": f"Upgraded to {new_role.value}"}

@router.post("/cancel-subscription")
async def cancel_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Cancel subscription and revert to free plan"""
    if current_user.role not in [UserRole.PRO, UserRole.ADMIN]:
        raise HTTPException(status_code=400, detail="Not subscribed to a paid plan")
        
    # Don't allow admins to downgrade themselves via this endpoint to prevent lockout
    if current_user.role == UserRole.ADMIN:
        raise HTTPException(status_code=400, detail="Admins cannot cancel subscription via this endpoint")

    current_user.role = UserRole.USER
    await db.commit()
    
    return {"message": "Subscription cancelled successfully"}

@router.get("/system-info")
async def get_system_info():
    """Get system capabilities like CUDA availability"""
    import torch
    return {
        "cuda_available": torch.cuda.is_available(),
        "cuda_device_count": torch.cuda.device_count() if torch.cuda.is_available() else 0,
        "cuda_device_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None
    }


# ============ API KEY MANAGEMENT ============

@router.get("/api-key")
async def get_api_key_info(
    current_user: User = Depends(get_current_user)
):
    """Get API key information (masked)"""
    if not current_user.api_key_hash and not current_user.api_key:
        return {"has_key": False, "key": None, "created_at": None}

    # Do not expose plaintext keys. Legacy rows with api_key are masked and
    # replaced the next time the user generates a key.
    if current_user.api_key_hash:
        masked_key = f"acx_...{current_user.api_key_last4 or '****'}"
    else:
        masked_key = current_user.api_key[:8] + "..." + current_user.api_key[-4:]
    
    return {
        "has_key": True,
        "key": masked_key,
        "created_at": current_user.api_key_created_at.isoformat() if current_user.api_key_created_at else None
    }


@router.post("/api-key/generate")
async def generate_api_key(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Generate a new API key (replaces existing one)"""
    # Only PRO and ADMIN users can generate API keys
    if current_user.role not in [UserRole.PRO, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="API keys are only available for PRO users"
        )
    
    new_key = current_user.generate_api_key()
    await db.commit()
    
    return {
        "api_key": new_key,
        "message": "New API key generated. Save it now, it won't be shown again!"
    }


@router.delete("/api-key")
async def revoke_api_key(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Revoke the current API key"""
    if not current_user.api_key_hash and not current_user.api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No API key to revoke"
        )
    
    current_user.api_key = None
    current_user.api_key_hash = None
    current_user.api_key_last4 = None
    current_user.api_key_created_at = None
    await db.commit()
    
    return {"message": "API key revoked successfully"}


# ============ USER SETTINGS ============

_ALLOWED_THEMES = {"dark", "light", "system"}

class UserSettingsUpdate(BaseModel):
    email_notifications: Optional[bool] = None
    theme: Optional[str] = None

    @field_validator('theme')
    @classmethod
    def validate_theme(cls, v):
        if v is not None and v not in _ALLOWED_THEMES:
            raise ValueError(f"Theme must be one of: {', '.join(sorted(_ALLOWED_THEMES))}")
        return v


@router.get("/settings")
async def get_user_settings(
    current_user: User = Depends(get_current_user)
):
    """Get user settings"""
    return {
        "email_notifications": current_user.email_notifications,
        "theme": current_user.theme
    }


@router.put("/settings")
async def update_user_settings(
    settings: UserSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update user settings"""
    if settings.email_notifications is not None:
        current_user.email_notifications = settings.email_notifications
    
    if settings.theme is not None:
        current_user.theme = settings.theme
    
    await db.commit()
    
    return {
        "email_notifications": current_user.email_notifications,
        "theme": current_user.theme,
        "message": "Settings updated successfully"
    }



