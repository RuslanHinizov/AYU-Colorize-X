@echo off
setlocal
cd /d "%~dp0..\backend"
set USE_SQLITE=true
.\.venv\Scripts\python.exe -m celery -A workers.celery_app:celery_app worker -Q main-queue --loglevel=info --concurrency=1 --pool=solo 1>worker_run.log 2>worker_err.log
