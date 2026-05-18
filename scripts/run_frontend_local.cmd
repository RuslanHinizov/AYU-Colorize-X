@echo off
setlocal
cd /d "%~dp0..\frontend"
"C:\Program Files\nodejs\npm.cmd" run dev -- --host 127.0.0.1 --port 5173 1>frontend_run.log 2>frontend_err.log
