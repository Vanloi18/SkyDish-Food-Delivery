@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title SkyDish Food Delivery - System Shutdown

:: ==============================================================================
:: 1. Chuyen working directory ve thu muc goc chua script
:: ==============================================================================
set "PROJECT_ROOT=%~dp0"
cd /d "%PROJECT_ROOT%"

echo ==============================================================================
echo            SKYDISH FOOD DELIVERY PLATFORM - SYSTEM SHUTDOWN
echo ==============================================================================
echo Thu muc du an: %PROJECT_ROOT%
echo.

:: ==============================================================================
:: 2. Dung ngrok tunnel neu dang chay
:: ==============================================================================
echo [1/2] Kiem tra va dong ngrok tunnel...
tasklist /fi "imagename eq ngrok.exe" 2>nul | findstr /i "ngrok.exe" >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    taskkill /f /im ngrok.exe >nul 2>&1
    echo   [OK] Da dong tien trinh ngrok tunnel.
) else (
    echo   - Khong co tien trinh ngrok nao dang chay.
)
echo.

:: ==============================================================================
:: 3. Dung cac container SkyDish bang docker compose down (KHONG dung -v)
:: ==============================================================================
echo [2/2] Dung cac container SkyDish [docker compose down]...
if exist "docker-compose.yml" (
    docker compose down
    if !ERRORLEVEL! EQU 0 (
        echo   [OK] Da dung va go bo cac container SkyDish.
    ) else (
        echo   [CANH BAO] Co loi khi chay 'docker compose down'.
    )
) else (
    echo   [LOI] Khong tim thay file docker-compose.yml tai %PROJECT_ROOT%
)

echo.
echo ==============================================================================
echo                               SKYDISH STOPPED
echo ==============================================================================
echo   - Da dong ngrok tunnel.
echo   - Da tat toan bo cac container cua he thong SkyDish.
echo   - Du lieu MongoDB duoc giu nguyen an toan [volume mongo-data khong bi xoa].
echo ==============================================================================
echo.
echo Nhan phim bat ky de dong cua so nay...
pause >nul
exit /b 0
