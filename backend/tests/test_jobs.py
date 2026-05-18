"""
Tests for /api/jobs/* endpoints.

AI processing and Celery are fully mocked so tests run
without GPU, model files, or a running Redis/Celery worker.
"""
import pytest
from unittest.mock import patch, AsyncMock, MagicMock

from tests.conftest import FAKE_JPEG


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

def _fake_job_file():
    """Returns (filename, bytes, content-type) for multipart upload."""
    return ("test.jpg", FAKE_JPEG, "image/jpeg")


def _job_upload_kwargs(job_type: str = "COLORIZE"):
    """Build kwargs for client.post('/api/jobs/process', ...)."""
    return dict(
        files={"file": _fake_job_file()},
        params={"type": job_type, "render_factor": 35, "model": "artistic", "device": "cpu"},
    )


# Context-manager that stubs out all processing side-effects
class _MockProcessing:
    """Patches save_upload_file + use_celery + Celery task so no real work happens."""

    def __enter__(self):
        self._p1 = patch(
            "routers.jobs.save_upload_file",
            new_callable=lambda: lambda *a, **kw: AsyncMock(return_value="media/uploads/fake.jpg"),
        )
        # save_upload_file is an async function → needs AsyncMock
        self._p_save = patch(
            "routers.jobs.save_upload_file",
            new=AsyncMock(return_value="media/uploads/fake.jpg"),
        )
        self._p_celery = patch("routers.jobs.use_celery", return_value=True)
        self._p_task = patch("workers.tasks.process_image_task")

        self._p_save.start()
        self._p_celery.start()
        mock_task = self._p_task.start()
        mock_task.delay = MagicMock()
        return mock_task

    def __exit__(self, *_):
        self._p_save.stop()
        self._p_celery.stop()
        self._p_task.stop()


# ─────────────────────────────────────────────────────────────
# Upload endpoint
# ─────────────────────────────────────────────────────────────

async def test_upload_requires_auth(client):
    r = await client.post(
        "/api/jobs/upload",
        files={"file": _fake_job_file()},
    )
    assert r.status_code == 401


async def test_upload_invalid_extension(client, user_headers):
    r = await client.post(
        "/api/jobs/upload",
        files={"file": ("evil.exe", b"MZ\x90\x00", "application/octet-stream")},
        headers=user_headers,
    )
    assert r.status_code == 400


async def test_upload_rejects_corrupted_image(client, user_headers):
    r = await client.post(
        "/api/jobs/upload",
        files={"file": ("broken.jpg", b"not-a-real-image", "image/jpeg")},
        headers=user_headers,
    )
    assert r.status_code == 400


async def test_upload_success(client, user_headers):
    with patch(
        "routers.jobs.save_upload_file",
        new=AsyncMock(return_value="media/uploads/fake.jpg"),
    ):
        r = await client.post(
            "/api/jobs/upload",
            files={"file": _fake_job_file()},
            headers=user_headers,
        )
    assert r.status_code == 200
    assert "file_path" in r.json()


# ─────────────────────────────────────────────────────────────
# Create job (process endpoint)
# ─────────────────────────────────────────────────────────────

async def test_create_job_requires_auth(client):
    r = await client.post("/api/jobs/process", **_job_upload_kwargs())
    assert r.status_code == 401


async def test_create_job_insufficient_credits(client, user_headers):
    """
    Drain user credits to 0, then attempt a job — expect 402.
    We update the user record directly in the test DB.
    """
    from models import User
    from sqlalchemy import select
    from tests.conftest import TestSessionLocal

    async with TestSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == "user@test.com"))
        user = result.scalar_one()
        user.credits = 0
        await session.commit()

    with _MockProcessing():
        r = await client.post(
            "/api/jobs/process",
            **_job_upload_kwargs(),
            headers=user_headers,
        )
    assert r.status_code == 402


async def test_create_job_invalid_type(client, user_headers):
    with _MockProcessing():
        r = await client.post(
            "/api/jobs/process",
            files={"file": _fake_job_file()},
            params={"type": "INVALID_TYPE"},
            headers=user_headers,
        )
    assert r.status_code == 400


async def test_create_job_invalid_render_factor(client, user_headers):
    with _MockProcessing():
        r = await client.post(
            "/api/jobs/process",
            files={"file": _fake_job_file()},
            params={"type": "COLORIZE", "render_factor": 99},
            headers=user_headers,
        )
    assert r.status_code == 400


async def test_create_job_success(client, user_headers):
    with _MockProcessing():
        r = await client.post(
            "/api/jobs/process",
            **_job_upload_kwargs(),
            headers=user_headers,
        )
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "PROCESSING"
    assert body["type"] == "COLORIZE"
    assert "id" in body
    assert "is_favorite" in body
    assert "collection" in body


async def test_create_upscale_job_success(client, user_headers):
    with _MockProcessing():
        r = await client.post(
            "/api/jobs/process",
            files={"file": _fake_job_file()},
            params={"type": "UPSCALE", "render_factor": 35, "model": "artistic", "device": "cpu"},
            headers=user_headers,
        )
    assert r.status_code == 200
    assert r.json()["type"] == "UPSCALE"


async def test_create_job_deducts_credit(client, user_headers):
    from models import User
    from sqlalchemy import select
    from tests.conftest import TestSessionLocal

    async with TestSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == "user@test.com"))
        credits_before = result.scalar_one().credits

    with _MockProcessing():
        await client.post(
            "/api/jobs/process",
            **_job_upload_kwargs(),
            headers=user_headers,
        )

    async with TestSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == "user@test.com"))
        credits_after = result.scalar_one().credits

    assert credits_after == credits_before - 1


# ─────────────────────────────────────────────────────────────
# List / get / delete
# ─────────────────────────────────────────────────────────────

async def test_list_jobs_empty(client, user_headers):
    r = await client.get("/api/jobs/", headers=user_headers)
    assert r.status_code == 200
    assert r.json() == []


async def test_list_jobs_returns_own_jobs_only(client, user_headers):
    with _MockProcessing():
        await client.post("/api/jobs/process", **_job_upload_kwargs(), headers=user_headers)

    # Register a second user and verify they see no jobs
    r2 = await client.post(
        "/api/auth/register",
        json={"email": "other@test.com", "password": "password123"},
    )
    other_headers = {"Authorization": f"Bearer {r2.json()['access_token']}"}

    r = await client.get("/api/jobs/", headers=other_headers)
    assert r.json() == []


async def test_get_job(client, user_headers):
    with _MockProcessing():
        create_r = await client.post(
            "/api/jobs/process", **_job_upload_kwargs(), headers=user_headers
        )
    job_id = create_r.json()["id"]

    r = await client.get(f"/api/jobs/{job_id}", headers=user_headers)
    assert r.status_code == 200
    assert r.json()["id"] == job_id


async def test_get_job_not_found(client, user_headers):
    r = await client.get("/api/jobs/nonexistent-uuid", headers=user_headers)
    assert r.status_code == 404


async def test_get_job_other_users_job(client, user_headers):
    """A user must not be able to access another user's job."""
    with _MockProcessing():
        create_r = await client.post(
            "/api/jobs/process", **_job_upload_kwargs(), headers=user_headers
        )
    job_id = create_r.json()["id"]

    r2 = await client.post(
        "/api/auth/register",
        json={"email": "other2@test.com", "password": "password123"},
    )
    other_headers = {"Authorization": f"Bearer {r2.json()['access_token']}"}
    r = await client.get(f"/api/jobs/{job_id}", headers=other_headers)
    assert r.status_code == 404


async def test_delete_job(client, user_headers):
    with _MockProcessing():
        create_r = await client.post(
            "/api/jobs/process", **_job_upload_kwargs(), headers=user_headers
        )
    job_id = create_r.json()["id"]

    with patch("routers.jobs.os.path.exists", return_value=False):
        r = await client.delete(f"/api/jobs/{job_id}", headers=user_headers)
    assert r.status_code == 204

    r = await client.get(f"/api/jobs/{job_id}", headers=user_headers)
    assert r.status_code == 404


async def test_delete_all_jobs(client, user_headers):
    with _MockProcessing():
        for _ in range(3):
            await client.post("/api/jobs/process", **_job_upload_kwargs(), headers=user_headers)

    with patch("routers.jobs.os.path.exists", return_value=False):
        r = await client.delete("/api/jobs/", headers=user_headers)
    assert r.status_code == 204

    r = await client.get("/api/jobs/", headers=user_headers)
    assert r.json() == []


# ─────────────────────────────────────────────────────────────
# Download
# ─────────────────────────────────────────────────────────────

async def test_download_not_completed_returns_400(client, user_headers):
    with _MockProcessing():
        create_r = await client.post(
            "/api/jobs/process", **_job_upload_kwargs(), headers=user_headers
        )
    job_id = create_r.json()["id"]

    r = await client.get(f"/api/jobs/{job_id}/download", headers=user_headers)
    assert r.status_code == 400


# ─────────────────────────────────────────────────────────────
# Favorites
# ─────────────────────────────────────────────────────────────

async def test_toggle_favorite(client, user_headers):
    with _MockProcessing():
        create_r = await client.post(
            "/api/jobs/process", **_job_upload_kwargs(), headers=user_headers
        )
    job_id = create_r.json()["id"]

    r = await client.post(f"/api/jobs/{job_id}/favorite", headers=user_headers)
    assert r.status_code == 200
    assert r.json()["is_favorite"] is True

    r = await client.post(f"/api/jobs/{job_id}/favorite", headers=user_headers)
    assert r.json()["is_favorite"] is False


async def test_list_favorites(client, user_headers):
    with _MockProcessing():
        create_r = await client.post(
            "/api/jobs/process", **_job_upload_kwargs(), headers=user_headers
        )
    job_id = create_r.json()["id"]
    await client.post(f"/api/jobs/{job_id}/favorite", headers=user_headers)

    r = await client.get("/api/jobs/favorites/list", headers=user_headers)
    assert r.status_code == 200
    ids = [j["id"] for j in r.json()]
    assert job_id in ids


# ─────────────────────────────────────────────────────────────
# Collections
# ─────────────────────────────────────────────────────────────

async def test_set_and_list_collection(client, user_headers):
    with _MockProcessing():
        create_r = await client.post(
            "/api/jobs/process", **_job_upload_kwargs(), headers=user_headers
        )
    job_id = create_r.json()["id"]

    r = await client.put(
        f"/api/jobs/{job_id}/collection",
        params={"collection": "My Photos"},
        headers=user_headers,
    )
    assert r.status_code == 200
    assert r.json()["collection"] == "My Photos"

    r = await client.get("/api/jobs/collections/list", headers=user_headers)
    assert "My Photos" in r.json()["collections"]


async def test_collection_name_too_long(client, user_headers):
    with _MockProcessing():
        create_r = await client.post(
            "/api/jobs/process", **_job_upload_kwargs(), headers=user_headers
        )
    job_id = create_r.json()["id"]

    r = await client.put(
        f"/api/jobs/{job_id}/collection",
        params={"collection": "x" * 101},
        headers=user_headers,
    )
    # FastAPI validates Query(max_length=100) and returns 422 before our code runs
    assert r.status_code in (400, 422)


async def test_clear_collection(client, user_headers):
    with _MockProcessing():
        create_r = await client.post(
            "/api/jobs/process", **_job_upload_kwargs(), headers=user_headers
        )
    job_id = create_r.json()["id"]

    await client.put(
        f"/api/jobs/{job_id}/collection",
        params={"collection": "Temp"},
        headers=user_headers,
    )
    r = await client.put(
        f"/api/jobs/{job_id}/collection",
        headers=user_headers,  # no collection param → clears it
    )
    assert r.status_code == 200
    assert r.json()["collection"] is None


# ─────────────────────────────────────────────────────────────
# Free-plan quantity limits
# ─────────────────────────────────────────────────────────────

async def test_free_plan_photo_limit(client, user_headers):
    """Free users can create at most 3 non-video jobs."""
    with _MockProcessing():
        for _ in range(3):
            r = await client.post(
                "/api/jobs/process", **_job_upload_kwargs(), headers=user_headers
            )
            assert r.status_code == 200

        r = await client.post(
            "/api/jobs/process", **_job_upload_kwargs(), headers=user_headers
        )
    assert r.status_code == 403
    assert "LIMIT_EXCEEDED_PHOTO" in r.json()["detail"]
