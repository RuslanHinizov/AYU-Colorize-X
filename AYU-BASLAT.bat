@echo off
title AYU ColorizeX - Baslatici
REM ================================================================
REM  AYU ColorizeX - Tum servisleri tek tikla baslatir
REM  Redis -> Celery worker -> Backend (8001) -> Frontend (5173)
REM ================================================================

set "ROOT=C:\Users\Ruslan\Desktop\ALL-Project\AYU-ColorizeX-Diplom"
set "PY=%ROOT%\backend\.venv\Scripts\python.exe"
set "NODEDIR=C:\Users\Ruslan\AppData\Local\Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe\node-v24.16.0-win-x64"
set "PATH=%NODEDIR%;%PATH%"
set "PYTHONUTF8=1"
set "PYTHONIOENCODING=utf-8"
set "USE_SQLITE=true"
set "USE_SDXL=true"
set "FACE_RESTORE_PROVIDER=codeformer"

echo ================================================
echo   AYU ColorizeX - Servisler baslatiliyor...
echo ================================================
echo.

REM --- Onceki process'leri temizle (port catismasini onler) ---
echo [0/4] Eski servisler kapatiliyor...
taskkill /IM redis-server.exe /F >nul 2>&1
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='python.exe'\" | Where-Object { $_.CommandLine -match 'uvicorn main:app|celery .*worker' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" >nul 2>&1
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object { $_.CommandLine -match 'vite' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" >nul 2>&1
ping -n 3 127.0.0.1 >nul
echo   Temizlendi.
echo.

echo [1/4] Redis (port 6379)...
start "AYU - Redis" cmd /k %ROOT%\backend\_redis\redis-server.exe --port 6379
ping -n 4 127.0.0.1 >nul

echo [2/4] Celery worker...
start "AYU - Celery" /d "%ROOT%\backend" cmd /k %PY% -m celery -A workers.celery_app worker --loglevel=info --pool=solo
ping -n 4 127.0.0.1 >nul

echo [3/4] Backend (uvicorn port 8001)...
start "AYU - Backend" /d "%ROOT%\backend" cmd /k %PY% -m uvicorn main:app --host 127.0.0.1 --port 8001
ping -n 6 127.0.0.1 >nul

echo [4/4] Frontend (Vite port 5173)...
start "AYU - Frontend" /d "%ROOT%\frontend" cmd /k npm run dev
ping -n 3 127.0.0.1 >nul

echo.
echo ================================================
echo   HAZIR! Servisler ayri pencerelerde calisiyor.
echo.
echo   Frontend : http://localhost:5173
echo   Backend  : http://127.0.0.1:8001
echo   Giris    : admin@ayu.local  /  ayu12345
echo ================================================
echo.
echo Frontend'in acilmasi icin ~10-15 sn bekleyin.
echo Bu pencereyi kapatabilirsiniz (servisler kendi pencerelerinde calisir).
ping -n 13 127.0.0.1 >nul
