# Pre-import pyarrow before backend paths enter sys.path (avoids WinError 6714
# when pyarrow._fill_cache scans the backend directory's reparse point).
import os as _os, tempfile as _tempfile
_cwd0 = _os.getcwd()
try:
    _os.chdir(_tempfile.gettempdir())
    import pyarrow as _pyarrow  # noqa: F401
except Exception:
    pass
finally:
    try:
        _os.chdir(_cwd0)
    except Exception:
        pass

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
