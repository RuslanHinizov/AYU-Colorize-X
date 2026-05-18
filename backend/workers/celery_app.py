from celery import Celery
from config import settings

celery_app = Celery(
    "worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["workers.tasks"],
)

celery_app.conf.task_routes = {
    "workers.tasks.process_image_task": {"queue": "main-queue"},
    "workers.tasks.process_video_task": {"queue": "main-queue"},
}
