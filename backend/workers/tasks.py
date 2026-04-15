"""
Celery Tasks for Background Job Processing
WebSocket notifications ve model caching ile optimize edilmiş.
"""
from workers.celery_app import celery_app
from services.ai_engine import colorize_image, colorize_video, upscale_image
from models.job import JobStatus
from celery import current_task
import asyncio
import logging

logger = logging.getLogger(__name__)


def get_event_loop():
    """Get or create event loop for async operations (Python 3.10+ safe)"""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop


def run_async(coro):
    """Run async coroutine from sync context"""
    loop = get_event_loop()
    return loop.run_until_complete(coro)


async def update_job_in_db(job_id: str, **kwargs):
    """Update job status in database"""
    from database import SessionLocal
    from sqlalchemy import update
    from models import Job
    
    async with SessionLocal() as session:
        await session.execute(
            update(Job).where(Job.id == job_id).values(**kwargs)
        )
        await session.commit()


async def send_ws_notification(user_id: str, notification_type: str, **kwargs):
    """Send WebSocket notification to user"""
    try:
        from routers.websocket import manager
        
        message = {"type": notification_type, **kwargs}
        await manager.send_to_user(user_id, message)
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
                run_async(update_job_in_db(job_id, progress=progress))
                
                # Send WebSocket notification
                run_async(send_ws_notification(
                    user_id, 
                    "job_progress",
                    job_id=job_id,
                    progress=progress
                ))
            except Exception as e:
                logger.error(f"Progress callback error: {e}")
    
    return callback


@celery_app.task(name="process_image_task", bind=True)
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
    resize: bool = False
):
    """
    Celery task to process an image with progress updates.
    """
    logger.info(f"Starting job {job_id} - Type: {job_type}")
    
    progress_callback = create_progress_callback(job_id, user_id)
    
    try:
        # Update status to processing
        run_async(update_job_in_db(job_id, status=JobStatus.PROCESSING.value, progress=0))
        
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
                progress_callback=progress_callback
            )

        elif job_type == "UPSCALE":
            processing_time = upscale_image(input_path, output_path)
        elif job_type == "RESTORE":
            from services.restoration_engine import restore_photo
            processing_time = restore_photo(
                input_path, output_path, device, 2,
                progress_callback=progress_callback
            )
        else:
            raise ValueError(f"Unknown job type: {job_type}")
        
        # Update job as completed
        run_async(update_job_in_db(
            job_id, 
            status=JobStatus.COMPLETED.value, 
            progress=100,
            processing_time=processing_time
        ))
        
        # Send completion notification via WebSocket
        run_async(send_ws_notification(
            user_id,
            "job_completed",
            job_id=job_id,
            output_path=output_path,
            processing_time=processing_time
        ))
        
        logger.info(f"Job {job_id} completed in {processing_time:.2f}s")
        
        return {
            "status": "completed", 
            "processing_time": processing_time, 
            "job_id": job_id
        }
        
    except Exception as e:
        logger.exception(f"Job {job_id} failed: {e}")
        
        # Update job as failed
        run_async(update_job_in_db(
            job_id, 
            status=JobStatus.FAILED.value, 
            progress=0,
            error_message=str(e)
        ))
        
        # Send failure notification via WebSocket
        run_async(send_ws_notification(
            user_id,
            "job_failed",
            job_id=job_id,
            error=str(e)
        ))
        
        return {"status": "failed", "error": str(e), "job_id": job_id}


@celery_app.task(name="process_video_task", bind=True)
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
        run_async(update_job_in_db(job_id, status=JobStatus.PROCESSING.value, progress=0))
        
        processing_time = colorize_video(
            input_path,
            output_path,
            render_factor,
            device,
            progress_callback=progress_callback
        )
        
        # Update job as completed
        run_async(update_job_in_db(
            job_id,
            status=JobStatus.COMPLETED.value,
            progress=100,
            processing_time=processing_time
        ))
        
        # Send completion notification
        run_async(send_ws_notification(
            user_id,
            "job_completed",
            job_id=job_id,
            output_path=output_path,
            processing_time=processing_time
        ))
        
        logger.info(f"Video job {job_id} completed in {processing_time:.2f}s")
        
        return {
            "status": "completed",
            "processing_time": processing_time,
            "job_id": job_id
        }
        
    except Exception as e:
        logger.exception(f"Video job {job_id} failed: {e}")
        
        run_async(update_job_in_db(
            job_id,
            status=JobStatus.FAILED.value,
            progress=0,
            error_message=str(e)
        ))
        
        run_async(send_ws_notification(
            user_id,
            "job_failed",
            job_id=job_id,
            error=str(e)
        ))
        
        return {"status": "failed", "error": str(e), "job_id": job_id}
