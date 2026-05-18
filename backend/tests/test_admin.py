"""
Tests for /api/admin/* endpoints.

All tests require admin role (403 otherwise).
AI processing and Celery are mocked where jobs are needed.
"""
from unittest.mock import patch, AsyncMock, MagicMock

from tests.conftest import FAKE_JPEG


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

def _job_file():
    return ("test.jpg", FAKE_JPEG, "image/jpeg")


def _job_kwargs():
    return dict(
        files={"file": _job_file()},
        params={"type": "COLORIZE", "render_factor": 35, "model": "artistic", "device": "cpu"},
    )


class _MockProcessing:
    """Same helper as in test_jobs — patches AI + Celery side-effects."""

    def __enter__(self):
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
# Access control
# ─────────────────────────────────────────────────────────────

async def test_stats_requires_admin(client, user_headers):
    r = await client.get("/api/admin/stats", headers=user_headers)
    assert r.status_code == 403


async def test_stats_requires_auth(client):
    r = await client.get("/api/admin/stats")
    assert r.status_code == 401


# ─────────────────────────────────────────────────────────────
# Stats
# ─────────────────────────────────────────────────────────────

async def test_get_system_stats_empty(client, admin_headers):
    r = await client.get("/api/admin/stats", headers=admin_headers)
    assert r.status_code == 200
    body = r.json()
    for key in ("total_users", "active_users", "total_jobs", "pending_jobs", "completed_jobs", "failed_jobs"):
        assert key in body
    # admin user itself is in DB
    assert body["total_users"] >= 1


async def test_get_system_stats_counts_jobs(client, admin_headers, user_headers):
    with _MockProcessing():
        await client.post("/api/jobs/process", **_job_kwargs(), headers=user_headers)

    r = await client.get("/api/admin/stats", headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["total_jobs"] >= 1


async def test_get_chart_data(client, admin_headers):
    r = await client.get("/api/admin/stats/charts", headers=admin_headers)
    assert r.status_code == 200
    body = r.json()
    assert "jobs_by_day" in body
    assert "users_by_day" in body
    assert "type_distribution" in body
    assert len(body["jobs_by_day"]) == 7


# ─────────────────────────────────────────────────────────────
# User listing
# ─────────────────────────────────────────────────────────────

async def test_list_users(client, admin_headers, user_headers):
    r = await client.get("/api/admin/users", headers=admin_headers)
    assert r.status_code == 200
    emails = [u["email"] for u in r.json()]
    # Both admin and regular user must appear
    assert "admin@test.com" in emails
    assert "user@test.com" in emails


async def test_list_users_has_stats_fields(client, admin_headers):
    r = await client.get("/api/admin/users", headers=admin_headers)
    assert r.status_code == 200
    user = r.json()[0]
    for key in ("id", "email", "role", "credits", "is_active", "total_jobs", "completed_jobs"):
        assert key in user, f"Missing field: {key}"


# ─────────────────────────────────────────────────────────────
# User CRUD
# ─────────────────────────────────────────────────────────────

async def test_create_user(client, admin_headers):
    r = await client.post(
        "/api/admin/users",
        json={"email": "newadmin@test.com", "password": "password123", "role": "USER", "credits": 50},
        headers=admin_headers,
    )
    assert r.status_code == 200
    body = r.json()
    assert body["email"] == "newadmin@test.com"
    assert body["credits"] == 50


async def test_create_user_duplicate_email(client, admin_headers):
    payload = {"email": "dup@test.com", "password": "password123", "role": "USER", "credits": 10}
    await client.post("/api/admin/users", json=payload, headers=admin_headers)
    r = await client.post("/api/admin/users", json=payload, headers=admin_headers)
    assert r.status_code == 400


async def test_create_user_short_password(client, admin_headers):
    r = await client.post(
        "/api/admin/users",
        json={"email": "short@test.com", "password": "abc", "role": "USER", "credits": 10},
        headers=admin_headers,
    )
    assert r.status_code == 400


async def test_update_user_credits(client, admin_headers, user_headers):
    # Get user id
    users_r = await client.get("/api/admin/users", headers=admin_headers)
    user = next((u for u in users_r.json() if u["email"] == "user@test.com"), None)
    assert user is not None
    user_id = user["id"]

    r = await client.put(
        f"/api/admin/users/{user_id}",
        json={"credits": 999},
        headers=admin_headers,
    )
    assert r.status_code == 200
    assert r.json()["credits"] == 999


async def test_update_user_role(client, admin_headers, user_headers):
    users_r = await client.get("/api/admin/users", headers=admin_headers)
    user = next((u for u in users_r.json() if u["email"] == "user@test.com"), None)
    assert user is not None, "user@test.com not found — user_headers fixture must create it"
    user_id = user["id"]

    r = await client.put(
        f"/api/admin/users/{user_id}",
        json={"role": "PRO"},
        headers=admin_headers,
    )
    assert r.status_code == 200
    assert r.json()["role"] == "PRO"


async def test_update_user_not_found(client, admin_headers):
    r = await client.put(
        "/api/admin/users/nonexistent-id",
        json={"credits": 0},
        headers=admin_headers,
    )
    assert r.status_code == 404


async def test_delete_user(client, admin_headers):
    # Create a throwaway user to delete
    r_create = await client.post(
        "/api/admin/users",
        json={"email": "todelete@test.com", "password": "password123", "role": "USER", "credits": 5},
        headers=admin_headers,
    )
    user_id = r_create.json()["id"]

    r = await client.delete(f"/api/admin/users/{user_id}", headers=admin_headers)
    assert r.status_code == 200

    # Verify gone from list
    users_r = await client.get("/api/admin/users", headers=admin_headers)
    emails = [u["email"] for u in users_r.json()]
    assert "todelete@test.com" not in emails


async def test_delete_own_admin_account_forbidden(client, admin_headers):
    users_r = await client.get("/api/admin/users", headers=admin_headers)
    admin = next((u for u in users_r.json() if u["email"] == "admin@test.com"), None)
    assert admin is not None
    admin_id = admin["id"]

    r = await client.delete(f"/api/admin/users/{admin_id}", headers=admin_headers)
    assert r.status_code == 400


async def test_delete_user_not_found(client, admin_headers):
    r = await client.delete("/api/admin/users/nonexistent-id", headers=admin_headers)
    assert r.status_code == 404


# ─────────────────────────────────────────────────────────────
# Bulk actions
# ─────────────────────────────────────────────────────────────

async def test_bulk_ban(client, admin_headers):
    # Create two users to ban
    ids = []
    for i in range(2):
        r = await client.post(
            "/api/admin/users",
            json={"email": f"bulk{i}@test.com", "password": "password123", "role": "USER", "credits": 5},
            headers=admin_headers,
        )
        ids.append(r.json()["id"])

    r = await client.post(
        "/api/admin/users/bulk",
        json={"user_ids": ids, "action": "ban"},
        headers=admin_headers,
    )
    assert r.status_code == 200
    assert "2" in r.json()["message"]


async def test_bulk_activate(client, admin_headers):
    r_create = await client.post(
        "/api/admin/users",
        json={"email": "inactive@test.com", "password": "password123", "role": "USER", "credits": 5},
        headers=admin_headers,
    )
    uid = r_create.json()["id"]
    # Ban first
    await client.post("/api/admin/users/bulk", json={"user_ids": [uid], "action": "ban"}, headers=admin_headers)
    # Re-activate
    r = await client.post(
        "/api/admin/users/bulk",
        json={"user_ids": [uid], "action": "activate"},
        headers=admin_headers,
    )
    assert r.status_code == 200


async def test_bulk_no_users_selected(client, admin_headers):
    r = await client.post(
        "/api/admin/users/bulk",
        json={"user_ids": [], "action": "ban"},
        headers=admin_headers,
    )
    assert r.status_code == 400


async def test_bulk_change_role(client, admin_headers):
    r_create = await client.post(
        "/api/admin/users",
        json={"email": "changerole@test.com", "password": "password123", "role": "USER", "credits": 5},
        headers=admin_headers,
    )
    uid = r_create.json()["id"]

    r = await client.post(
        "/api/admin/users/bulk",
        json={"user_ids": [uid], "action": "change_role", "role": "PRO"},
        headers=admin_headers,
    )
    assert r.status_code == 200


# ─────────────────────────────────────────────────────────────
# Job management
# ─────────────────────────────────────────────────────────────

async def test_list_all_jobs(client, admin_headers, user_headers):
    with _MockProcessing():
        await client.post("/api/jobs/process", **_job_kwargs(), headers=user_headers)

    r = await client.get("/api/admin/jobs", headers=admin_headers)
    assert r.status_code == 200
    assert len(r.json()) >= 1
    job = r.json()[0]
    assert "user_email" in job
    assert "status" in job


async def test_list_all_jobs_pagination(client, admin_headers, user_headers):
    with _MockProcessing():
        for _ in range(3):
            await client.post("/api/jobs/process", **_job_kwargs(), headers=user_headers)

    r = await client.get("/api/admin/jobs?limit=2&offset=0", headers=admin_headers)
    assert r.status_code == 200
    assert len(r.json()) <= 2


async def test_get_job_detail(client, admin_headers, user_headers):
    with _MockProcessing():
        create_r = await client.post("/api/jobs/process", **_job_kwargs(), headers=user_headers)
    job_id = create_r.json()["id"]

    r = await client.get(f"/api/admin/jobs/{job_id}", headers=admin_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["id"] == job_id
    assert "user_email" in body


async def test_get_job_detail_not_found(client, admin_headers):
    r = await client.get("/api/admin/jobs/nonexistent-uuid", headers=admin_headers)
    assert r.status_code == 404


async def test_delete_job_admin(client, admin_headers, user_headers):
    with _MockProcessing():
        create_r = await client.post("/api/jobs/process", **_job_kwargs(), headers=user_headers)
    job_id = create_r.json()["id"]

    with patch("routers.admin.os.path.exists", return_value=False) if False else _no_patch():
        r = await client.delete(f"/api/admin/jobs/{job_id}", headers=admin_headers)
    assert r.status_code == 200


# ─────────────────────────────────────────────────────────────
# System settings
# ─────────────────────────────────────────────────────────────

async def test_get_system_settings(client, admin_headers):
    r = await client.get("/api/admin/system/settings", headers=admin_headers)
    assert r.status_code == 200
    body = r.json()
    assert "maintenance_mode" in body
    assert "max_concurrent_jobs" in body


async def test_update_system_settings(client, admin_headers):
    r = await client.post(
        "/api/admin/system/settings",
        json={"maintenance_mode": True, "announcement": "Down for maintenance", "max_concurrent_jobs": 3},
        headers=admin_headers,
    )
    assert r.status_code == 200
    body = r.json()
    assert body["maintenance_mode"] is True
    assert body["announcement"] == "Down for maintenance"


async def test_public_settings_accessible_without_auth(client):
    r = await client.get("/api/admin/system/public-settings")
    assert r.status_code == 200
    body = r.json()
    assert "maintenance_mode" in body


# ─────────────────────────────────────────────────────────────
# Audit logs
# ─────────────────────────────────────────────────────────────

async def test_audit_logs_initially_empty(client, admin_headers):
    r = await client.get("/api/admin/audit-logs", headers=admin_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


async def test_audit_logs_record_user_creation(client, admin_headers):
    await client.post(
        "/api/admin/users",
        json={"email": "audit@test.com", "password": "password123", "role": "USER", "credits": 10},
        headers=admin_headers,
    )

    r = await client.get("/api/admin/audit-logs", headers=admin_headers)
    assert r.status_code == 200
    actions = [log["action"] for log in r.json()]
    assert "user_created" in actions


async def test_audit_logs_fields(client, admin_headers):
    await client.post(
        "/api/admin/users",
        json={"email": "auditfield@test.com", "password": "password123", "role": "USER", "credits": 10},
        headers=admin_headers,
    )
    r = await client.get("/api/admin/audit-logs", headers=admin_headers)
    log = r.json()[0]
    for key in ("id", "admin_email", "action", "created_at"):
        assert key in log


# ─────────────────────────────────────────────────────────────
# Uptime
# ─────────────────────────────────────────────────────────────

async def test_get_uptime(client, admin_headers):
    r = await client.get("/api/admin/system/uptime", headers=admin_headers)
    assert r.status_code == 200
    body = r.json()
    assert "uptime_seconds" in body
    assert body["uptime_seconds"] >= 0


# ─────────────────────────────────────────────────────────────
# Helper context manager (no-op)
# ─────────────────────────────────────────────────────────────

class _no_patch:
    def __enter__(self): return self
    def __exit__(self, *_): pass
