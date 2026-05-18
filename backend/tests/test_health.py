"""Tests for the health-check and root endpoints."""


async def test_root(client):
    r = await client.get("/")
    assert r.status_code == 200
    body = r.json()
    assert body["version"] == "1.0.0"
    assert "docs" in body


async def test_health(client):
    r = await client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


async def test_system_info(client):
    """system-info is public and always returns CUDA flags."""
    r = await client.get("/api/auth/system-info")
    assert r.status_code == 200
    body = r.json()
    assert "cuda_available" in body
    assert isinstance(body["cuda_available"], bool)
