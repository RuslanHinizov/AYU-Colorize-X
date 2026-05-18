"""
Test fixtures for AYU ColorizeX backend.

Environment is configured BEFORE any app imports so that
  - SQLite is used (no PostgreSQL required)
  - a throwaway SECRET_KEY is used for JWT signing
"""
import os

# ── Must be set before any app module is imported ────────────────────────────
os.environ["USE_SQLITE"] = "true"
os.environ.setdefault("SECRET_KEY", "pytest-secret-key-not-for-production-use")

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# ── Dedicated test database (separate file, never the real one) ───────────────
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test_ayu_pytest.db"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)
TestSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# ── Database lifecycle ────────────────────────────────────────────────────────

@pytest_asyncio.fixture(autouse=True)
async def fresh_db():
    """
    Before every test: rebuild the schema from current metadata.
    After every test: drop all tables so schema changes never drift.
    """
    from database import Base
    import models  # noqa: F401 - ensure ORM tables are registered in metadata

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    yield

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


# ── In-process state reset ────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """Clear in-memory rate-limit store between tests."""
    from routers.auth import _rate_limit_store
    _rate_limit_store.clear()
    yield
    _rate_limit_store.clear()


@pytest.fixture(autouse=True)
def reset_celery_cache():
    """Reset the cached Celery availability flag between tests."""
    import routers.jobs as jobs_module
    jobs_module._celery_available = None
    yield
    jobs_module._celery_available = None


@pytest.fixture(autouse=True)
def reset_app_settings():
    """Reset in-memory app settings (maintenance_mode, etc.) between tests."""
    import app_state
    original = dict(app_state.app_settings)
    yield
    app_state.app_settings.update(original)


# ── HTTP client ───────────────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def client(fresh_db):
    """
    AsyncClient wired to the FastAPI app with the test database injected
    via dependency override.
    """
    from main import app
    from database import get_db

    async def _override_get_db():
        async with TestSessionLocal() as session:
            yield session

    app.dependency_overrides[get_db] = _override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac

    app.dependency_overrides.pop(get_db, None)


# ── Auth helpers ──────────────────────────────────────────────────────────────

async def _do_register(client: AsyncClient, email: str, password: str) -> dict:
    r = await client.post("/api/auth/register", json={"email": email, "password": password})
    assert r.status_code == 200, f"Register failed: {r.text}"
    return r.json()


async def _do_login(client: AsyncClient, email: str, password: str) -> dict:
    r = await client.post(
        "/api/auth/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert r.status_code == 200, f"Login failed: {r.text}"
    return r.json()


@pytest_asyncio.fixture
async def user_token(client) -> str:
    data = await _do_register(client, "user@test.com", "password123")
    return data["access_token"]


@pytest_asyncio.fixture
async def user_headers(user_token) -> dict:
    return {"Authorization": f"Bearer {user_token}"}


@pytest_asyncio.fixture
async def pro_user_token(client) -> str:
    """PRO user — created directly in DB to bypass stripe."""
    from services.auth_service import get_password_hash
    from models import User, UserRole

    async with TestSessionLocal() as session:
        user = User(
            email="pro@test.com",
            password_hash=get_password_hash("password123"),
            role=UserRole.PRO,
            credits=500,
            is_active=True,
        )
        session.add(user)
        await session.commit()

    data = await _do_login(client, "pro@test.com", "password123")
    return data["access_token"]


@pytest_asyncio.fixture
async def pro_headers(pro_user_token) -> dict:
    return {"Authorization": f"Bearer {pro_user_token}"}


@pytest_asyncio.fixture
async def admin_token(client) -> str:
    """ADMIN user — always created directly in DB."""
    from services.auth_service import get_password_hash
    from models import User, UserRole

    async with TestSessionLocal() as session:
        admin = User(
            email="admin@test.com",
            password_hash=get_password_hash("adminpass123"),
            role=UserRole.ADMIN,
            credits=99999,
            is_active=True,
        )
        session.add(admin)
        await session.commit()

    data = await _do_login(client, "admin@test.com", "adminpass123")
    return data["access_token"]


@pytest_asyncio.fixture
async def admin_headers(admin_token) -> dict:
    return {"Authorization": f"Bearer {admin_token}"}


# ── Tiny fake JPEG bytes (valid extension, tiny payload) ─────────────────────

FAKE_JPEG = (
    b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00"
    b"\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t"
    b"\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a"
    b"\x1f\x1e\x1d\x1a\x1c\x1c $.' \",#\x1c\x1c(7),01444\x1f'9=82<.342\x1e"
    b"\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xc4\x00"
    b"\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00"
    b"\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\xff\xda\x00"
    b"\x08\x01\x01\x00\x00?\x00\xfb\xff\xd9"
)
