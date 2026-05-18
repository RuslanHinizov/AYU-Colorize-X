"""
Tests for /api/auth/* endpoints.

Covers: register, login, logout, /me, settings, API-key management,
rate-limiter, and edge-cases validated in the previous production audit.
"""
import pytest


# ─────────────────────────────────────────────────────────────
# REGISTER
# ─────────────────────────────────────────────────────────────

async def test_register_success(client):
    r = await client.post(
        "/api/auth/register",
        json={"email": "new@test.com", "password": "password123"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["access_token"]
    assert body["token_type"] == "bearer"
    assert body["user"]["email"] == "new@test.com"
    assert body["user"]["role"] == "USER"
    assert body["user"]["credits"] == 10


async def test_register_student_email_gives_student_role(client):
    r = await client.post(
        "/api/auth/register",
        json={"email": "student@ayu.edu.kz", "password": "password123"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["user"]["role"] == "STUDENT"
    assert body["user"]["credits"] == 100


async def test_register_duplicate_email(client):
    payload = {"email": "dup@test.com", "password": "password123"}
    await client.post("/api/auth/register", json=payload)
    r = await client.post("/api/auth/register", json=payload)
    assert r.status_code == 400
    assert "already registered" in r.json()["detail"]


async def test_register_password_too_short(client):
    r = await client.post(
        "/api/auth/register",
        json={"email": "x@test.com", "password": "short"},
    )
    assert r.status_code == 422


async def test_register_password_too_long(client):
    r = await client.post(
        "/api/auth/register",
        json={"email": "x@test.com", "password": "a" * 129},
    )
    assert r.status_code == 422


async def test_register_invalid_email(client):
    r = await client.post(
        "/api/auth/register",
        json={"email": "not-an-email", "password": "password123"},
    )
    assert r.status_code == 422


# ─────────────────────────────────────────────────────────────
# LOGIN
# ─────────────────────────────────────────────────────────────

async def test_login_success(client):
    await client.post(
        "/api/auth/register",
        json={"email": "login@test.com", "password": "password123"},
    )
    r = await client.post(
        "/api/auth/login",
        data={"username": "login@test.com", "password": "password123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert r.status_code == 200
    assert r.json()["access_token"]


async def test_login_wrong_password(client):
    await client.post(
        "/api/auth/register",
        json={"email": "wp@test.com", "password": "password123"},
    )
    r = await client.post(
        "/api/auth/login",
        data={"username": "wp@test.com", "password": "wrongpassword"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert r.status_code == 401


async def test_login_nonexistent_user(client):
    r = await client.post(
        "/api/auth/login",
        data={"username": "nobody@test.com", "password": "password123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert r.status_code == 401


async def test_login_disabled_user(client):
    """Banned user cannot log in."""
    from services.auth_service import get_password_hash
    from models import User, UserRole
    from tests.conftest import TestSessionLocal

    async with TestSessionLocal() as session:
        user = User(
            email="banned@test.com",
            password_hash=get_password_hash("password123"),
            role=UserRole.USER,
            credits=10,
            is_active=False,
        )
        session.add(user)
        await session.commit()

    r = await client.post(
        "/api/auth/login",
        data={"username": "banned@test.com", "password": "password123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert r.status_code == 403


# ─────────────────────────────────────────────────────────────
# /me
# ─────────────────────────────────────────────────────────────

async def test_get_me(client, user_headers):
    r = await client.get("/api/auth/me", headers=user_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["email"] == "user@test.com"
    assert body["is_active"] is True


async def test_get_me_unauthenticated(client):
    r = await client.get("/api/auth/me")
    assert r.status_code == 401


async def test_get_me_invalid_token(client):
    r = await client.get("/api/auth/me", headers={"Authorization": "Bearer garbage"})
    assert r.status_code == 401


# ─────────────────────────────────────────────────────────────
# LOGOUT
# ─────────────────────────────────────────────────────────────

async def test_logout_blacklists_token(client, user_token, user_headers):
    # Token works before logout
    r = await client.get("/api/auth/me", headers=user_headers)
    assert r.status_code == 200

    # Logout
    r = await client.post("/api/auth/logout", headers=user_headers)
    assert r.status_code == 200

    # Same token is now rejected
    r = await client.get("/api/auth/me", headers=user_headers)
    assert r.status_code == 401


# ─────────────────────────────────────────────────────────────
# RATE LIMITER
# ─────────────────────────────────────────────────────────────

async def test_rate_limit_on_register(client):
    """After 10 attempts from the same IP the 11th is blocked."""
    from routers.auth import RATE_LIMIT_MAX

    for i in range(RATE_LIMIT_MAX):
        await client.post(
            "/api/auth/register",
            json={"email": f"rl{i}@test.com", "password": "password123"},
        )

    r = await client.post(
        "/api/auth/register",
        json={"email": "rl_extra@test.com", "password": "password123"},
    )
    assert r.status_code == 429


# ─────────────────────────────────────────────────────────────
# USER SETTINGS
# ─────────────────────────────────────────────────────────────

async def test_get_settings(client, user_headers):
    r = await client.get("/api/auth/settings", headers=user_headers)
    assert r.status_code == 200
    body = r.json()
    assert "email_notifications" in body
    assert "theme" in body


async def test_update_settings_valid_theme(client, user_headers):
    r = await client.put(
        "/api/auth/settings",
        json={"theme": "light"},
        headers=user_headers,
    )
    assert r.status_code == 200
    assert r.json()["theme"] == "light"


async def test_update_settings_invalid_theme(client, user_headers):
    r = await client.put(
        "/api/auth/settings",
        json={"theme": "hacker-green"},
        headers=user_headers,
    )
    assert r.status_code == 422


async def test_update_email_notifications(client, user_headers):
    r = await client.put(
        "/api/auth/settings",
        json={"email_notifications": False},
        headers=user_headers,
    )
    assert r.status_code == 200
    assert r.json()["email_notifications"] is False


# ─────────────────────────────────────────────────────────────
# API KEY MANAGEMENT
# ─────────────────────────────────────────────────────────────

async def test_get_api_key_info_no_key(client, user_headers):
    r = await client.get("/api/auth/api-key", headers=user_headers)
    assert r.status_code == 200
    assert r.json()["has_key"] is False


async def test_generate_api_key_requires_pro(client, user_headers):
    """Free users cannot generate API keys."""
    r = await client.post("/api/auth/api-key/generate", headers=user_headers)
    assert r.status_code == 403


async def test_generate_api_key_pro_user(client, pro_headers):
    r = await client.post("/api/auth/api-key/generate", headers=pro_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["api_key"].startswith("acx_")


async def test_revoke_api_key(client, pro_headers):
    # Generate first
    await client.post("/api/auth/api-key/generate", headers=pro_headers)
    # Then revoke
    r = await client.delete("/api/auth/api-key", headers=pro_headers)
    assert r.status_code == 200
    # Info should now show no key
    r = await client.get("/api/auth/api-key", headers=pro_headers)
    assert r.json()["has_key"] is False


async def test_revoke_api_key_none_exists(client, user_headers):
    r = await client.delete("/api/auth/api-key", headers=user_headers)
    assert r.status_code == 400
