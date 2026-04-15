from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from database import get_db
from models import User, Job, UserRole, JobStatus, AuditLog
from routers.auth import get_current_user
from services import get_password_hash
import torch
import time
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/admin", tags=["Admin"])

# Server start time for uptime calculation
_server_start_time = time.time()


def require_admin(current_user: User = Depends(get_current_user)):
    """Dependency to require admin role"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


async def log_admin_action(db: AsyncSession, admin_email: str, action: str, target: str = None, details: str = None):
    """Log an admin action to the audit trail"""
    log_entry = AuditLog(
        admin_email=admin_email,
        action=action,
        target=target,
        details=details
    )
    db.add(log_entry)
    await db.commit()


# ============ PYDANTIC MODELS ============

class SystemStats(BaseModel):
    total_users: int
    active_users: int
    total_jobs: int
    pending_jobs: int
    completed_jobs: int
    failed_jobs: int


class UserUpdate(BaseModel):
    role: Optional[UserRole] = None
    credits: Optional[int] = None
    is_active: Optional[bool] = None


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: UserRole = UserRole.USER
    credits: int = 10


class BulkUserAction(BaseModel):
    user_ids: List[str]
    action: str  # "ban", "activate", "delete", "change_role"
    role: Optional[UserRole] = None


# ============ STATS ============

@router.get("/stats", response_model=SystemStats)
async def get_system_stats(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get system statistics"""
    total_users_result = await db.execute(select(func.count(User.id)))
    total_users = total_users_result.scalar()

    active_users_result = await db.execute(select(func.count(User.id)).where(User.is_active == True))
    active_users = active_users_result.scalar()

    total_jobs_result = await db.execute(select(func.count(Job.id)))
    total_jobs = total_jobs_result.scalar()

    pending_jobs_result = await db.execute(select(func.count(Job.id)).where(Job.status == JobStatus.PENDING))
    pending_jobs = pending_jobs_result.scalar()

    completed_jobs_result = await db.execute(select(func.count(Job.id)).where(Job.status == JobStatus.COMPLETED))
    completed_jobs = completed_jobs_result.scalar()

    failed_jobs_result = await db.execute(select(func.count(Job.id)).where(Job.status == JobStatus.FAILED))
    failed_jobs = failed_jobs_result.scalar()

    return {
        "total_users": total_users,
        "active_users": active_users,
        "total_jobs": total_jobs,
        "pending_jobs": pending_jobs,
        "completed_jobs": completed_jobs,
        "failed_jobs": failed_jobs
    }


@router.get("/stats/charts")
async def get_chart_data(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get 7-day chart data for dashboard"""
    now = datetime.utcnow()
    seven_days_ago = now - timedelta(days=7)

    # Jobs per day (last 7 days)
    jobs_by_day = []
    users_by_day = []
    for i in range(7):
        day_start = (now - timedelta(days=6 - i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)

        job_count_result = await db.execute(
            select(func.count(Job.id)).where(
                Job.created_at >= day_start,
                Job.created_at < day_end
            )
        )
        job_count = job_count_result.scalar() or 0

        user_count_result = await db.execute(
            select(func.count(User.id)).where(
                User.created_at >= day_start,
                User.created_at < day_end
            )
        )
        user_count = user_count_result.scalar() or 0

        jobs_by_day.append({
            "date": day_start.strftime("%d/%m"),
            "label": day_start.strftime("%A")[:3],
            "count": job_count
        })
        users_by_day.append({
            "date": day_start.strftime("%d/%m"),
            "label": day_start.strftime("%A")[:3],
            "count": user_count
        })

    # Job type distribution
    type_distribution = []
    for jt in ["COLORIZE", "VIDEO_COLORIZE", "RESTORE", "UPSCALE"]:
        count_result = await db.execute(
            select(func.count(Job.id)).where(Job.type == jt)
        )
        count = count_result.scalar() or 0
        type_distribution.append({"type": jt, "count": count})

    return {
        "jobs_by_day": jobs_by_day,
        "users_by_day": users_by_day,
        "type_distribution": type_distribution
    }


# ============ USERS ============

@router.get("/users")
async def list_all_users(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """List all users with detailed statistics"""
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()

    user_list = []
    for user in users:
        total_jobs_result = await db.execute(
            select(func.count(Job.id)).where(Job.user_id == user.id)
        )
        total_jobs = total_jobs_result.scalar() or 0

        completed_jobs_result = await db.execute(
            select(func.count(Job.id)).where(
                Job.user_id == user.id,
                Job.status == JobStatus.COMPLETED
            )
        )
        completed_jobs = completed_jobs_result.scalar() or 0

        processing_time_result = await db.execute(
            select(func.sum(Job.processing_time)).where(
                Job.user_id == user.id,
                Job.processing_time.isnot(None)
            )
        )
        total_processing_time = processing_time_result.scalar() or 0

        last_job_result = await db.execute(
            select(Job.created_at).where(Job.user_id == user.id).order_by(Job.created_at.desc()).limit(1)
        )
        last_job = last_job_result.scalar_one_or_none()

        user_list.append({
            "id": str(user.id),
            "email": user.email,
            "role": user.role.value,
            "credits": user.credits,
            "is_active": user.is_active,
            "created_at": user.created_at.isoformat(),
            "email_notifications": getattr(user, 'email_notifications', True),
            "has_api_key": bool(getattr(user, 'api_key', None)),
            "total_jobs": total_jobs,
            "completed_jobs": completed_jobs,
            "total_processing_time": round(total_processing_time, 2) if total_processing_time else 0,
            "last_activity": last_job.isoformat() if last_job else None
        })

    return user_list


@router.post("/users")
async def create_user(
    user_data: UserCreate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Admin: Create a new user"""
    # Check if email already exists
    result = await db.execute(select(User).where(User.email == user_data.email))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Bu e-posta zaten kayıtlı")

    if len(user_data.password) < 6:
        raise HTTPException(status_code=400, detail="Şifre en az 6 karakter olmalı")

    new_user = User(
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        role=user_data.role,
        credits=user_data.credits
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    await log_admin_action(db, admin.email, "user_created", user_data.email, f"Rol: {user_data.role.value}, Kredi: {user_data.credits}")

    return {
        "id": str(new_user.id),
        "email": new_user.email,
        "role": new_user.role.value,
        "credits": new_user.credits,
        "is_active": new_user.is_active
    }


@router.put("/users/{user_id}")
async def update_user(
    user_id: str,
    user_update: UserUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Update user details"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    changes = []
    if user_update.role is not None:
        changes.append(f"Rol: {user.role.value} -> {user_update.role.value}")
        user.role = user_update.role
    if user_update.credits is not None:
        changes.append(f"Kredi: {user.credits} -> {user_update.credits}")
        user.credits = user_update.credits
    if user_update.is_active is not None:
        changes.append(f"Durum: {'Aktif' if user.is_active else 'Yasaklı'} -> {'Aktif' if user_update.is_active else 'Yasaklı'}")
        user.is_active = user_update.is_active

    await db.commit()
    await db.refresh(user)

    if changes:
        await log_admin_action(db, admin.email, "user_updated", user.email, ", ".join(changes))

    return {
        "id": str(user.id),
        "email": user.email,
        "role": user.role.value,
        "credits": user.credits,
        "is_active": user.is_active
    }


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Delete a user permanently"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own admin account")

    email = user.email
    await db.delete(user)
    await db.commit()

    await log_admin_action(db, admin.email, "user_deleted", email)

    return {"message": "User deleted successfully"}


@router.post("/users/bulk")
async def bulk_user_action(
    bulk: BulkUserAction,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Perform bulk actions on users"""
    if not bulk.user_ids:
        raise HTTPException(status_code=400, detail="Kullanıcı seçilmedi")

    result = await db.execute(select(User).where(User.id.in_(bulk.user_ids)))
    users = result.scalars().all()

    if not users:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")

    affected = 0
    try:
        for user in users:
            if user.id == admin.id:
                continue  # Skip self

            if bulk.action == "ban":
                user.is_active = False
                affected += 1
            elif bulk.action == "activate":
                user.is_active = True
                affected += 1
            elif bulk.action == "delete":
                await db.delete(user)
                affected += 1
            elif bulk.action == "change_role" and bulk.role:
                user.role = bulk.role
                affected += 1

        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Toplu işlem başarısız, değişiklikler geri alındı: {str(e)}")

    action_labels = {
        "ban": "yasaklandı",
        "activate": "aktifleştirildi",
        "delete": "silindi",
        "change_role": f"rol değiştirildi ({bulk.role.value if bulk.role else ''})"
    }
    await log_admin_action(
        db, admin.email, f"bulk_{bulk.action}",
        f"{affected} kullanıcı",
        action_labels.get(bulk.action, bulk.action)
    )

    return {"message": f"{affected} kullanıcı {action_labels.get(bulk.action, 'işlendi')}"}


# ============ JOBS ============

@router.get("/jobs")
async def list_all_jobs(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """List all jobs with user email and extra details"""
    result = await db.execute(select(Job).order_by(Job.created_at.desc()).limit(100))
    jobs = result.scalars().all()

    job_list = []
    for job in jobs:
        # Get user email
        user_result = await db.execute(select(User.email).where(User.id == job.user_id))
        user_email = user_result.scalar_one_or_none() or "Silinmiş"

        job_list.append({
            "id": str(job.id),
            "user_id": str(job.user_id),
            "user_email": user_email,
            "type": job.type.value,
            "status": job.status.value,
            "progress": job.progress or 0,
            "processing_time": job.processing_time,
            "error_message": job.error_message,
            "input_path": job.input_path,
            "output_path": job.output_path,
            "device": getattr(job, 'device', None),
            "render_factor": getattr(job, 'render_factor', None),
            "created_at": job.created_at.isoformat()
        })

    return job_list


@router.get("/jobs/{job_id}")
async def get_job_detail(
    job_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get detailed job information"""
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()

    if not job:
        raise HTTPException(status_code=404, detail="İş bulunamadı")

    user_result = await db.execute(select(User.email).where(User.id == job.user_id))
    user_email = user_result.scalar_one_or_none() or "Silinmiş"

    return {
        "id": str(job.id),
        "user_id": str(job.user_id),
        "user_email": user_email,
        "type": job.type.value,
        "status": job.status.value,
        "progress": job.progress or 0,
        "processing_time": job.processing_time,
        "error_message": job.error_message,
        "input_path": job.input_path,
        "output_path": job.output_path,
        "device": getattr(job, 'device', None),
        "render_factor": getattr(job, 'render_factor', None),
        "is_favorite": getattr(job, 'is_favorite', False),
        "collection": getattr(job, 'collection', None),
        "created_at": job.created_at.isoformat()
    }


@router.delete("/jobs/{job_id}")
async def delete_job_admin(
    job_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Admin: Delete/Kill a job"""
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()

    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    if job.status == JobStatus.PROCESSING:
        job.status = JobStatus.FAILED
        job.error_message = "Terminated by Admin"
    else:
        await db.delete(job)

    await db.commit()

    await log_admin_action(db, admin.email, "job_deleted", str(job_id))

    return {"message": "Job terminated/deleted"}


# ============ SYSTEM ============

@router.get("/system/resources")
async def get_system_resources(
    admin: User = Depends(require_admin)
):
    """Get system resource usage"""
    import psutil
    import shutil
    from services.model_cache import model_cache

    cpu_percent = psutil.cpu_percent(interval=0.1)

    memory = psutil.virtual_memory()
    ram_percent = memory.percent

    total, used, free = shutil.disk_usage("/")
    disk_percent = (used / total) * 100

    gpu_stats = []
    if torch.cuda.is_available():
        gpu_stats = [{
            "name": torch.cuda.get_device_name(0),
            "memory_used": torch.cuda.memory_allocated(0),
            "memory_total": torch.cuda.get_device_properties(0).total_memory,
            "temperature": 0
        }]

    cache_info = model_cache.get_cache_info()

    return {
        "cpu": cpu_percent,
        "ram": ram_percent,
        "disk": disk_percent,
        "gpu": gpu_stats,
        "model_cache": cache_info
    }


@router.get("/system/uptime")
async def get_system_uptime(
    admin: User = Depends(require_admin)
):
    """Get server uptime information"""
    uptime_seconds = time.time() - _server_start_time
    days = int(uptime_seconds // 86400)
    hours = int((uptime_seconds % 86400) // 3600)
    minutes = int((uptime_seconds % 3600) // 60)
    seconds = int(uptime_seconds % 60)

    return {
        "uptime_seconds": uptime_seconds,
        "uptime_formatted": f"{days}g {hours}s {minutes}d {seconds}sn",
        "started_at": datetime.utcfromtimestamp(_server_start_time).isoformat()
    }


class SystemSettings(BaseModel):
    maintenance_mode: bool
    announcement: Optional[str] = None
    max_concurrent_jobs: int = 5


from app_state import app_settings as _settings


@router.get("/system/settings", response_model=SystemSettings)
async def get_settings(
    admin: User = Depends(require_admin)
):
    return _settings


@router.get("/system/public-settings")
async def get_public_settings():
    """Public endpoint - returns announcement and maintenance status for frontend"""
    return {
        "maintenance_mode": _settings["maintenance_mode"],
        "announcement": _settings["announcement"],
        "max_concurrent_jobs": _settings["max_concurrent_jobs"]
    }


@router.post("/system/settings")
async def update_settings(
    settings: SystemSettings,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    _settings["maintenance_mode"] = settings.maintenance_mode
    _settings["announcement"] = settings.announcement
    _settings["max_concurrent_jobs"] = settings.max_concurrent_jobs

    await log_admin_action(db, admin.email, "settings_updated", None, f"Bakım: {settings.maintenance_mode}")

    return _settings


@router.post("/system/clear-model-cache")
async def clear_model_cache(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Clear AI model cache to free memory"""
    from services.model_cache import model_cache

    cache_info_before = model_cache.get_cache_info()
    model_cache.clear_cache()
    cache_info_after = model_cache.get_cache_info()

    await log_admin_action(db, admin.email, "cache_cleared")

    return {
        "message": "Model cache cleared",
        "before": cache_info_before,
        "after": cache_info_after
    }


@router.get("/system/websocket-stats")
async def get_websocket_stats(
    admin: User = Depends(require_admin)
):
    """Get WebSocket connection statistics"""
    from routers.websocket import manager

    return {
        "active_connections": manager.get_connection_count()
    }


# ============ AUDIT LOGS ============

@router.get("/audit-logs")
async def get_audit_logs(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    limit: int = 50
):
    """Get recent admin audit logs"""
    result = await db.execute(
        select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)
    )
    logs = result.scalars().all()

    return [
        {
            "id": log.id,
            "admin_email": log.admin_email,
            "action": log.action,
            "target": log.target,
            "details": log.details,
            "created_at": log.created_at.isoformat()
        }
        for log in logs
    ]
