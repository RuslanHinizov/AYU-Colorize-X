"""
Celery Tasks for Background Job Processing
WebSocket notifications ve model caching ile optimize edilmiş.
"""
from workers.celery_app import celery_app
from services.ai_engine import colorize_image, colorize_video, restore_image, upscale_image
from services.bg_service import remove_background
from models.job import JobStatus
import logging
import os

from sqlalchemy import create_engine, update
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

logger = logging.getLogger(__name__)

_sync_engine = None
_sync_session_factory = None
_sync_engine_pid = None


def _sync_database_url() -> str:
    """Return a worker-safe synchronous SQLAlchemy URL.

    Celery tasks run in synchronous prefork workers. Reusing FastAPI's asyncpg
    engine/event loop inside those children causes asyncpg connection state to
    leak across operations. The worker only needs simple status updates, so it
    uses an isolated synchronous engine.
    """
    if os.getenv("USE_SQLITE", "true").lower() == "true":
        return "sqlite:///./ayu_colorize.db"

    from config import settings

    url = settings.DATABASE_URL
    if url.startswith("postgresql+asyncpg://"):
        return url.replace("postgresql+asyncpg://", "postgresql://", 1)
    if url.startswith("sqlite+aiosqlite:///"):
        return url.replace("sqlite+aiosqlite:///", "sqlite:///", 1)
    return url


def _get_sync_session_factory():
    global _sync_engine, _sync_session_factory, _sync_engine_pid

    pid = os.getpid()
    if _sync_session_factory is not None and _sync_engine_pid == pid:
        return _sync_session_factory

    if _sync_engine is not None:
        try:
            _sync_engine.dispose()
        except Exception:
            logger.debug("Could not dispose inherited worker DB engine", exc_info=True)

    url = _sync_database_url()
    connect_args = {"check_same_thread": False} if url.startswith("sqlite") else {}
    _sync_engine = create_engine(
        url,
        future=True,
        pool_pre_ping=True,
        poolclass=NullPool,
        connect_args=connect_args,
    )
    _sync_session_factory = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=_sync_engine,
        expire_on_commit=False,
    )
    _sync_engine_pid = pid
    return _sync_session_factory


def update_job_in_db(job_id: str, **kwargs):
    """Update job status in database"""
    from models import Job

    if "status" in kwargs and kwargs["status"] is not None:
        kwargs["status"] = kwargs["status"] if isinstance(kwargs["status"], JobStatus) else JobStatus(kwargs["status"])

    session_factory = _get_sync_session_factory()
    with session_factory() as session:
        session.execute(
            update(Job).where(Job.id == job_id).values(**kwargs)
        )
        session.commit()


def send_ws_notification(user_id: str, notification_type: str, **kwargs):
    """Publish a WebSocket notification via Redis.

    The worker is a different process from FastAPI, so direct access to the
    process-local WebSocket manager cannot reach connected browser sockets.
    """
    try:
        from services.job_events import publish_job_event

        publish_job_event(user_id, notification_type, **kwargs)
    except Exception as e:
        logger.warning(f"Failed to send WebSocket notification: {e}")


def create_progress_callback(job_id: str, user_id: str):
    """Create a progress callback that updates DB and sends WebSocket notification"""
    last_progress = [0]  # Use list to allow modification in nested function
    
    def callback(progress: int):
        # Only update if progress changed significantly (avoid too many updates)
        if progress - last_progress[0] >= 5 or progress >= 95:
            last_progress[0] = progress
            
            try:
                # Update database
                update_job_in_db(job_id, progress=progress)
                
                # Send WebSocket notification
                send_ws_notification(
                    user_id, 
                    "job_progress",
                    job_id=job_id,
                    progress=progress
                )
            except Exception as e:
                logger.error(f"Progress callback error: {e}")
    
    return callback


def _finalize_job(job_id: str, user_id: str, output_path: str, processing_time: float) -> dict:
    """Mark a job as COMPLETED and send a WebSocket completion notification."""
    update_job_in_db(
        job_id,
        status=JobStatus.COMPLETED.value,
        progress=100,
        processing_time=processing_time,
    )
    send_ws_notification(
        user_id,
        "job_completed",
        job_id=job_id,
        output_path=output_path,
        processing_time=processing_time,
    )
    return {"status": "completed", "processing_time": processing_time, "job_id": job_id}


def _fail_job(job_id: str, user_id: str, error: Exception) -> dict:
    """Mark a job as FAILED and send a WebSocket failure notification."""
    update_job_in_db(
        job_id,
        status=JobStatus.FAILED.value,
        progress=0,
        error_message=str(error),
    )
    send_ws_notification(
        user_id,
        "job_failed",
        job_id=job_id,
        error=str(error),
    )
    return {"status": "failed", "error": str(error), "job_id": job_id}


@celery_app.task(name="workers.tasks.process_image_task", bind=True)
def process_image_task(
    self,
    job_id: str,
    user_id: str,
    job_type: str,
    input_path: str,
    output_path: str,
    render_factor: int = 35,
    model: str = "artistic",
    device: str = "cpu",
    watermark: bool = False,
    resize: bool = False,
    enhance_mode: str = "auto",
    scale: int = 2,
    color_preset: str = "none",
    bg_type: str = "transparent",
    bg_color: str = None,
):
    """
    Celery task to process an image with progress updates.
    Supports: COLORIZE (with color_preset), UPSCALE (scale 2/4/8), RESTORE, BG_REMOVE.
    """
    logger.info(f"Starting job {job_id} - Type: {job_type}")

    progress_callback = create_progress_callback(job_id, user_id)

    try:
        # Update status to processing
        update_job_in_db(job_id, status=JobStatus.PROCESSING.value, progress=0)

        processing_time = 0

        if job_type == "COLORIZE":
            processing_time = colorize_image(
                input_path,
                output_path,
                render_factor,
                model,
                device,
                watermark,
                resize,
                progress_callback=progress_callback,
                color_preset=color_preset,
            )

        elif job_type == "UPSCALE":
            processing_time = upscale_image(
                input_path, output_path,
                scale=scale,
                device=device,
                enhance_mode=enhance_mode,
                progress_callback=progress_callback,
            )

        elif job_type == "RESTORE":
            processing_time = restore_image(
                input_path,
                output_path,
                device=device,
                scale=scale,
                enhance_mode=enhance_mode,
                progress_callback=progress_callback,
            )

        elif job_type == "BG_REMOVE":
            processing_time = remove_background(
                input_path,
                output_path,
                bg_type=bg_type,
                bg_color=bg_color,
                progress_callback=progress_callback,
            )

        else:
            raise ValueError(f"Unknown job type: {job_type}")

        logger.info(f"Job {job_id} completed in {processing_time:.2f}s")
        return _finalize_job(job_id, user_id, output_path, processing_time)

    except Exception as e:
        logger.exception(f"Job {job_id} failed: {e}")
        return _fail_job(job_id, user_id, e)


@celery_app.task(name="workers.tasks.process_video_task", bind=True)
def process_video_task(
    self,
    job_id: str,
    user_id: str,
    input_path: str,
    output_path: str,
    render_factor: int = 30,
    device: str = "cpu"
):
    """
    Celery task to process a video with progress updates.
    """
    logger.info(f"Starting video job {job_id}")
    
    progress_callback = create_progress_callback(job_id, user_id)
    
    try:
        # Update status to processing
        update_job_in_db(job_id, status=JobStatus.PROCESSING.value, progress=0)
        
        processing_time = colorize_video(
            input_path,
            output_path,
            render_factor,
            device,
            progress_callback=progress_callback
        )
        
        logger.info(f"Video job {job_id} completed in {processing_time:.2f}s")
        return _finalize_job(job_id, user_id, output_path, processing_time)

    except Exception as e:
        logger.exception(f"Video job {job_id} failed: {e}")
        return _fail_job(job_id, user_id, e)
