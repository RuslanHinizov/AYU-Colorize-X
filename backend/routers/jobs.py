"""
Jobs Router - Image/Video Processing API
Celery task queue ve WebSocket notifications ile optimize edilmiş.
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, delete
from pydantic import BaseModel
from typing import List, Optional
from database import get_db
from models import User, Job, JobType, JobStatus, UserRole
from routers.auth import get_current_user
from services import save_upload_file, get_output_path
from services.system_settings import get_system_settings
from config import settings
import os
import asyncio
import logging
import mimetypes

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/jobs", tags=["Jobs"])


class JobResponse(BaseModel):
    id: str
    type: str
    status: str
    input_path: str
    output_path: Optional[str]
    processing_time: Optional[float]
    device: Optional[str]
    render_factor: Optional[int]
    progress: Optional[int]
    error_message: Optional[str]
    is_favorite: bool = False
    collection: Optional[str] = None
    created_at: str


def job_to_response(job: Job) -> dict:
    """Convert Job model to response dict"""
    return {
        "id": str(job.id),
        "type": job.type.value,
        "status": job.status.value,
        "input_path": job.input_path,
        "output_path": job.output_path,
        "processing_time": job.processing_time,
        "device": job.device,
        "render_factor": job.render_factor,
        "progress": job.progress,
        "error_message": job.error_message,
        "is_favorite": job.is_favorite,
        "collection": job.collection,
        "created_at": job.created_at.isoformat()
    }


async def _get_job_or_404(job_id: str, user_id: str, db: AsyncSession) -> Job:
    """Fetch a job that belongs to *user_id*, raising HTTP 404 if not found."""
    result = await db.execute(
        select(Job).where(and_(Job.id == job_id, Job.user_id == user_id))
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return job


def _delete_job_files(job: Job) -> None:
    """Delete the input and output files for a job.

    Errors are logged as warnings but never raised — a missing file should not
    prevent the database record from being removed.
    """
    try:
        if job.input_path and os.path.exists(job.input_path):
            os.remove(job.input_path)
        if job.output_path and os.path.exists(job.output_path):
            os.remove(job.output_path)
    except Exception as e:
        logger.warning(f"Error deleting files for job {job.id}: {e}")


_celery_available: bool | None = None  # None = not yet checked

def use_celery() -> bool:
    """Check if Celery/Redis is available.

    Result is cached after the first successful ping so we do not perform a
    blocking network round-trip on every request.  On failure the result is
    NOT cached so that recovery is possible after a Redis restart.
    """
    global _celery_available
    if os.getenv("USE_SQLITE", "true").lower() == "true":
        return False
    if _celery_available is True:
        return True
    try:
        import redis as _redis
        r = _redis.from_url(settings.REDIS_URL, socket_connect_timeout=1, socket_timeout=1)
        r.ping()
        _celery_available = True
        return True
    except Exception:
        _celery_available = None  # keep retrying on next call
        return False


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload an image file"""
    try:
        file_path = await save_upload_file(file)
        return {"file_path": file_path, "message": "File uploaded successfully"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="File upload failed")


@router.post("/process", response_model=JobResponse)
async def create_job(
    type: str,
    file: UploadFile = File(...),
    render_factor: int = 35,
    model: str = "artistic",
    device: str = "cpu",
    enhance_mode: str = "auto",
    scale: int = 2,

    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new image processing job
    """
    # Validate parameters
    if render_factor < 7 or render_factor > 45:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="render_factor must be between 7 and 45")
    if model not in ("artistic", "stable"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="model must be 'artistic' or 'stable'")
    if device not in ("cpu", "gpu"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="device must be 'cpu' or 'gpu'")
    enhance_mode = enhance_mode.strip().lower().replace("-", "_")
    if enhance_mode not in ("auto", "restore", "upscale", "restore_upscale"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="enhance_mode must be 'auto', 'restore', 'upscale', or 'restore_upscale'",
        )
    if scale not in (2, 4):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="scale must be 2 or 4")

    # Parse job type
    try:
        job_type = JobType(type)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid job type: {type}")

    # Check concurrent jobs limit
    from sqlalchemy import func
    system_settings = await get_system_settings(db)
    max_concurrent = system_settings.get("max_concurrent_jobs", 5)
    processing_count_result = await db.execute(
        select(func.count(Job.id)).where(Job.status == JobStatus.PROCESSING)
    )
    processing_count = processing_count_result.scalar() or 0
    if processing_count >= max_concurrent:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Sistem şu anda meşgul. Maksimum {max_concurrent} eşzamanlı işlem limiti. Lütfen bekleyin."
        )

    locked_user = await db.scalar(
        select(User).where(User.id == current_user.id).with_for_update()
    )
    if not locked_user or not locked_user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

    # Check if user has enough credits
    if locked_user.credits < 1:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Insufficient credits"
        )
    
    # Plan Limitations Logic
    is_free = locked_user.role in [UserRole.USER, UserRole.STUDENT]
    
    # Device Restriction (Free = CPU only)
    if is_free:
        device = "cpu"
    
    # Watermark & Resize (Free only)
    apply_watermark = is_free
    resize_input = is_free

    # Quantity Limits (Free only) - use SELECT FOR UPDATE to prevent race conditions
    if is_free:
        from sqlalchemy import func

        # Lock user's jobs rows to prevent concurrent limit bypass
        if job_type == JobType.VIDEO_COLORIZE:
            query = select(func.count()).where(
                and_(
                    Job.user_id == locked_user.id,
                    Job.type == JobType.VIDEO_COLORIZE,
                    Job.status != JobStatus.FAILED
                )
            )
            count = await db.scalar(query)
            if count >= 2:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="LIMIT_EXCEEDED_VIDEO"
                )
        else:
            query = select(func.count()).where(
                and_(
                    Job.user_id == locked_user.id,
                    Job.type != JobType.VIDEO_COLORIZE,
                    Job.status != JobStatus.FAILED
                )
            )
            count = await db.scalar(query)
            if count >= 3:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="LIMIT_EXCEEDED_PHOTO"
                )

    try:
        # Save uploaded file
        input_path = await save_upload_file(file)
        output_path = get_output_path(input_path, job_type.value)
        
        # Create job record
        new_job = Job(
            user_id=locked_user.id,
            type=job_type,
            status=JobStatus.PENDING,
            input_path=input_path,
            output_path=output_path,
            device=device,
            render_factor=render_factor,
            progress=0
        )
        
        db.add(new_job)

        # Deduct 1 credit from user
        locked_user.credits -= 1

        await db.commit()
        await db.refresh(new_job)

        job_id = str(new_job.id)
        user_id = str(locked_user.id)
        
        # Try to use Celery, fallback to background task
        if use_celery():
            logger.info(f"Dispatching job {job_id} to Celery")
            
            if job_type == JobType.VIDEO_COLORIZE:
                from workers.tasks import process_video_task
                process_video_task.delay(
                    job_id=job_id,
                    user_id=user_id,
                    input_path=input_path,
                    output_path=output_path,
                    render_factor=render_factor,
                    device=device
                )
            else:
                from workers.tasks import process_image_task
                process_image_task.delay(
                    job_id=job_id,
                    user_id=user_id,
                    job_type=job_type.value,
                    input_path=input_path,
                    output_path=output_path,
                    render_factor=render_factor,
                    model=model,
                    device=device,
                    watermark=apply_watermark,
                    resize=resize_input,
                    enhance_mode=enhance_mode,
                )
            
            # Update status to processing
            new_job.status = JobStatus.PROCESSING
            await db.commit()
        else:
            logger.info(f"Celery not available, using background processing for job {job_id}")
            # Update status to processing immediately
            new_job.status = JobStatus.PROCESSING
            new_job.progress = 0
            await db.commit()

            # Run processing as a background task (non-blocking)
            asyncio.create_task(
                process_job_inline(
                    job_id, user_id, job_type, input_path, output_path,
                    render_factor, model, device, apply_watermark, resize_input,
                    enhance_mode, scale
                )
            )

        # Refresh to get latest state
        await db.refresh(new_job)
        return job_to_response(new_job)
        
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        await db.rollback()
        logger.exception(f"Exception in create_job: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Job creation failed. Please try again.")


@router.get("/", response_model=List[JobResponse])
async def list_jobs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all jobs for current user"""
    result = await db.execute(
        select(Job).where(Job.user_id == current_user.id).order_by(Job.created_at.desc())
    )
    jobs = result.scalars().all()

    return [job_to_response(job) for job in jobs]


# ============ FAVORITES & COLLECTIONS ============
# These MUST be defined before /{job_id} to avoid route shadowing

@router.get("/favorites/list", response_model=List[JobResponse])
async def list_favorites(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all favorite jobs"""
    result = await db.execute(
        select(Job).where(
            and_(Job.user_id == current_user.id, Job.is_favorite == True)
        ).order_by(Job.created_at.desc())
    )
    jobs = result.scalars().all()
    return [job_to_response(job) for job in jobs]


@router.get("/collections/list")
async def list_collections(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all unique collections for user"""
    from sqlalchemy import distinct
    result = await db.execute(
        select(distinct(Job.collection)).where(
            and_(Job.user_id == current_user.id, Job.collection != None)
        )
    )
    collections = [row[0] for row in result.fetchall() if row[0]]
    return {"collections": collections}


@router.get("/collections/{collection_name}", response_model=List[JobResponse])
async def get_collection_jobs(
    collection_name: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all jobs in a specific collection"""
    result = await db.execute(
        select(Job).where(
            and_(Job.user_id == current_user.id, Job.collection == collection_name)
        ).order_by(Job.created_at.desc())
    )
    jobs = result.scalars().all()
    return [job_to_response(job) for job in jobs]


# /{job_id} routes MUST come after /favorites and /collections routes
@router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get job status and details"""
    job = await _get_job_or_404(job_id, current_user.id, db)
    return job_to_response(job)


@router.get("/{job_id}/download")
async def download_result(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Download processed image"""
    job = await _get_job_or_404(job_id, current_user.id, db)

    if job.status != JobStatus.COMPLETED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Job not completed yet")
    
    if not job.output_path or not os.path.exists(job.output_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Output file not found")
    
    media_type = mimetypes.guess_type(job.output_path)[0] or "application/octet-stream"
    ext = os.path.splitext(job.output_path)[1] or (".mp4" if job.type == JobType.VIDEO_COLORIZE else ".jpg")
    filename = f"processed_{job_id}{ext}"
        
    return FileResponse(job.output_path, media_type=media_type, filename=filename)


@router.delete("/", status_code=status.HTTP_204_NO_CONTENT)
async def delete_all_jobs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete all jobs for the current user.

    NOTE: must be registered BEFORE /{job_id} so Starlette's [^/]* regex
    (which allows an empty capture group) does not shadow this route.
    """
    result = await db.execute(
        select(Job).where(Job.user_id == current_user.id)
    )
    jobs = result.scalars().all()

    # Delete files first
    for job in jobs:
        _delete_job_files(job)

    # Bulk delete from database
    await db.execute(
        delete(Job).where(Job.user_id == current_user.id)
    )
    await db.commit()
    return None


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a specific job and its associated files"""
    job = await _get_job_or_404(job_id, current_user.id, db)
    _delete_job_files(job)
    await db.delete(job)
    await db.commit()
    return None


@router.post("/{job_id}/favorite")
async def toggle_favorite(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Toggle favorite status for a job"""
    job = await _get_job_or_404(job_id, current_user.id, db)
    job.is_favorite = not job.is_favorite
    await db.commit()

    return {"is_favorite": job.is_favorite}


@router.put("/{job_id}/collection")
async def set_collection(
    job_id: str,
    collection: Optional[str] = Query(None, max_length=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Set or remove collection for a job"""
    # Strip and validate collection name
    if collection is not None:
        collection = collection.strip()
        if not collection:
            collection = None
        elif len(collection) > 100:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Collection name too long (max 100 characters)")

    job = await _get_job_or_404(job_id, current_user.id, db)
    job.collection = collection
    await db.commit()

    return {"collection": job.collection}


async def process_job_inline(
    job_id: str,
    user_id: str,
    job_type: JobType,
    input_path: str,
    output_path: str,
    render_factor: int,
    model: str,
    device: str,
    watermark: bool,
    resize: bool,
    enhance_mode: str = "auto",
    scale: int = 2,
):
    """
    Background job processing fallback when Celery is not available.
    Uses asyncio.to_thread for non-blocking execution.
    Sends real-time WebSocket progress notifications.
    """
    from services.ai_engine import colorize_image, colorize_video, restore_image, upscale_image
    from routers.websocket import notify_job_progress, notify_job_completed, notify_job_failed
    from database import SessionLocal
    from sqlalchemy import update

    loop = asyncio.get_running_loop()
    last_progress = [0]

    async def update_progress_async(percent: int):
        """Update progress in database and notify via WebSocket"""
        try:
            async with SessionLocal() as session:
                await session.execute(
                    update(Job)
                    .where(and_(Job.id == job_id, Job.status == JobStatus.PROCESSING))
                    .values(progress=percent)
                )
                await session.commit()
            # Send WebSocket notification
            await notify_job_progress(user_id, job_id, percent)
        except Exception as e:
            logger.warning(f"Failed to update progress: {e}")

    def progress_callback(percent: int):
        """Thread-safe progress callback that schedules async update"""
        if percent - last_progress[0] >= 3 or percent >= 95:
            last_progress[0] = percent
            asyncio.run_coroutine_threadsafe(update_progress_async(percent), loop)

    async with SessionLocal() as session:
        try:
            # Send initial progress
            await notify_job_progress(user_id, job_id, 5)

            processing_time = 0

            if job_type == JobType.COLORIZE:
                processing_time = await asyncio.to_thread(
                    colorize_image,
                    input_path, output_path, render_factor, model, device, watermark, resize,
                    progress_callback
                )
            elif job_type == JobType.VIDEO_COLORIZE:
                processing_time = await asyncio.to_thread(
                    colorize_video,
                    input_path, output_path, render_factor, device,
                    progress_callback
                )
            elif job_type == JobType.UPSCALE:
                processing_time = await asyncio.to_thread(
                    upscale_image,
                    input_path, output_path, scale, device, enhance_mode,
                    progress_callback
                )
            elif job_type == JobType.RESTORE:
                processing_time = await asyncio.to_thread(
                    restore_image,
                    input_path, output_path, device, scale, enhance_mode,
                    progress_callback
                )
            else:
                raise ValueError(f"Unknown job type: {job_type}")

            # Update as completed
            await session.execute(
                update(Job).where(Job.id == job_id).values(
                    status=JobStatus.COMPLETED,
                    processing_time=processing_time,
                    progress=100
                )
            )
            await session.commit()

            # Notify completion via WebSocket
            await notify_job_completed(user_id, job_id, output_path, processing_time)
            logger.info(f"Job {job_id} completed in {processing_time:.2f}s")

        except Exception as e:
            logger.exception(f"Job processing failed: {e}")
            await session.execute(
                update(Job).where(Job.id == job_id).values(
                    status=JobStatus.FAILED,
                    error_message=str(e),
                    progress=0
                )
            )
            await session.commit()

            # Notify failure via WebSocket
            await notify_job_failed(user_id, job_id, str(e))



