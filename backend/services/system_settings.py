import json
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app_state import app_settings
from database import SessionLocal
from models.system_setting import SystemSetting

DEFAULT_SYSTEM_SETTINGS = {
    "maintenance_mode": False,
    "announcement": None,
    "max_concurrent_jobs": 5,
}


def _coerce_settings(raw: dict[str, Any]) -> dict[str, Any]:
    settings = {**DEFAULT_SYSTEM_SETTINGS, **raw}
    settings["maintenance_mode"] = bool(settings.get("maintenance_mode"))
    settings["announcement"] = settings.get("announcement") or None
    try:
        settings["max_concurrent_jobs"] = max(1, int(settings.get("max_concurrent_jobs", 5)))
    except (TypeError, ValueError):
        settings["max_concurrent_jobs"] = DEFAULT_SYSTEM_SETTINGS["max_concurrent_jobs"]
    return settings


async def get_system_settings(db: AsyncSession | None = None) -> dict[str, Any]:
    async def _read(session: AsyncSession) -> dict[str, Any]:
        result = await session.execute(select(SystemSetting).where(SystemSetting.key == "system"))
        row = result.scalar_one_or_none()
        if not row:
            settings = DEFAULT_SYSTEM_SETTINGS.copy()
        else:
            settings = _coerce_settings(json.loads(row.value))
        app_settings.update(settings)
        return settings

    if db is not None:
        return await _read(db)

    async with SessionLocal() as session:
        return await _read(session)


async def set_system_settings(values: dict[str, Any], db: AsyncSession) -> dict[str, Any]:
    settings = _coerce_settings(values)
    result = await db.execute(select(SystemSetting).where(SystemSetting.key == "system"))
    row = result.scalar_one_or_none()
    payload = json.dumps(settings, separators=(",", ":"))
    if row:
        row.value = payload
    else:
        db.add(SystemSetting(key="system", value=payload))
    app_settings.update(settings)
    return settings
