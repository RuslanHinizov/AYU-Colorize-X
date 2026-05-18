import logging
import hmac
import hashlib
import secrets
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from config import settings
from models.user import UserRole

logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

STUDENT_EMAIL_DOMAINS = ["@ayu.edu.kz", "@yesevi.edu.tr"]

# In-memory token blacklist.
# WARNING: This is reset on every process restart and is NOT shared between
# multiple workers. For production deployments with Celery workers or multiple
# uvicorn instances, replace this with a Redis SET:
#   import redis; r = redis.from_url(settings.REDIS_URL)
#   r.sadd("token_blacklist", token)
#   r.expireat("token_blacklist:<token>", token_exp)
_token_blacklist: set = set()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)


def generate_api_key() -> str:
    return f"acx_{secrets.token_urlsafe(32)}"


def hash_api_key(api_key: str) -> str:
    return hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        api_key.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

def is_student_email(email: str) -> bool:
    """Check if email belongs to a student"""
    return any(email.lower().endswith(domain) for domain in STUDENT_EMAIL_DOMAINS)

def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str):
    """Decode and verify a JWT token, checking blacklist"""
    if token in _token_blacklist:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None

def blacklist_token(token: str):
    """Add a token to the blacklist (invalidate on logout)"""
    _token_blacklist.add(token)
