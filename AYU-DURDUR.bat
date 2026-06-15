@echo off
title AYU ColorizeX - Durdurucu
echo ================================================
echo   AYU ColorizeX - Servisler durduruluyor...
echo ================================================

echo [1/4] Redis...
taskkill /IM redis-server.exe /F >nul 2>&1

echo [2/4] Backend (uvicorn)...
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='python.exe'\" | Where-Object { $_.CommandLine -match 'uvicorn main:app' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"

echo [3/4] Celery worker...
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='python.exe'\" | Where-Object { $_.CommandLine -match 'celery.*worker' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"

echo [4/4] Frontend (Vite/node)...
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object { $_.CommandLine -match 'vite' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"

REM Port 8001'i tutan kalan process varsa temizle
powershell -NoProfile -Command "try { $p = (Get-NetTCPConnection -LocalPort 8001 -State Listen -ErrorAction SilentlyContinue).OwningProcess; if ($p) { Stop-Process -Id $p -Force } } catch {}"

echo.
echo Tum AYU servisleri durduruldu.
ping -n 4 127.0.0.1 >nul
