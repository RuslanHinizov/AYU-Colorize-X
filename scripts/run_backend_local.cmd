@echo off
setlocal
cd /d "%~dp0..\backend"
set USE_SQLITE=true
.\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 1>backend_run.log 2>backend_err.log
