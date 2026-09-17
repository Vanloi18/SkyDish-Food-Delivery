@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title SkyDish Food Delivery - System Launcher

:: ==============================================================================
:: 1. Chuyen working directory ve thu muc goc chua script
:: ==============================================================================
set "PROJECT_ROOT=%~dp0"
cd /d "%PROJECT_ROOT%"

echo ==============================================================================
echo            SKYDISH FOOD DELIVERY PLATFORM - ONE-CLICK LAUNCHER
echo ==============================================================================
echo Thu muc du an: %PROJECT_ROOT%
echo.

:: ==============================================================================
:: 2. Kiem tra su ton tai cua file docker-compose.yml
:: ==============================================================================
if not exist "docker-compose.yml" (
    echo [LOI] Khong tim thay file docker-compose.yml tai thu muc goc:
    echo       %PROJECT_ROOT%
    echo Vui long dam bao file START-SKYDISH.bat nam tai thu muc goc cua du an.
    goto :ERROR_EXIT
)

:: ==============================================================================
:: 3. Doc cau hinh FRONTEND_PORT tu file .env (neu co)
:: ==============================================================================
set "FRONTEND_PORT=3000"
if exist ".env" (
    for /f "usebackq tokens=1,2 delims==" %%A in (".env") do (
        set "KEY=%%A"
        set "VAL=%%B"
        if /i "!KEY!"=="FRONTEND_PORT" (
            set "FRONTEND_PORT=!VAL!"
        )
    )
)
set "FRONTEND_URL=http://localhost:!FRONTEND_PORT!"

:: ==============================================================================
:: 4. Kiem tra Docker CLI co trong PATH khong
:: ==============================================================================
where docker >nul 2>&1
if !ERRORLEVEL! NEQ 0 (
    echo [LOI] Khong tim thay lenh 'docker' trong he thong!
    echo Vui long cai dat Docker Desktop va dam bao Docker da duoc them vao PATH.
    echo Website: https://www.docker.com/products/docker-desktop/
    goto :ERROR_EXIT
)

:: ==============================================================================
:: 5. Kiem tra Docker Engine / Daemon co dang hoat dong khong
:: ==============================================================================
echo [BUOC 1/5] Kiem tra Docker Engine...
docker info >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    echo   - Docker Engine dang hoat dong tot.
    goto :DOCKER_READY
)

echo   [!] Docker Engine hien chua hoat dong.
echo   [!] Dang tim kiem Docker Desktop de khoi dong tu dong...

:: Tim kiem file thuc thi Docker Desktop tren Windows
set "DOCKER_EXE="
if exist "%LOCALAPPDATA%\Programs\DockerDesktop\Docker Desktop.exe" (
    set "DOCKER_EXE=%LOCALAPPDATA%\Programs\DockerDesktop\Docker Desktop.exe"
) else if exist "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" (
    set "DOCKER_EXE=%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
) else if exist "%ProgramW6432%\Docker\Docker\Docker Desktop.exe" (
    set "DOCKER_EXE=%ProgramW6432%\Docker\Docker\Docker Desktop.exe"
) else if exist "%LOCALAPPDATA%\Docker\Docker Desktop.exe" (
    set "DOCKER_EXE=%LOCALAPPDATA%\Docker\Docker Desktop.exe"
)

if "!DOCKER_EXE!"=="" (
    echo.
    echo [LOI] Khong the tu dong tim thay duong dan Docker Desktop.exe tren may tinh!
    echo Vui long mo ung dung Docker Desktop thu cong.
    echo Sau khi Docker Desktop khoi dong xong [icon mau xanh], hay chay lai file nay.
    goto :ERROR_EXIT
)

echo   - Tim thay: "!DOCKER_EXE!"
echo   - Dang khoi chay Docker Desktop, vui long cho...
start "" "!DOCKER_EXE!"

echo   - Cho Docker Daemon khoi dong hoan toan [toi da 90 giay]...
set /a WAIT_SECONDS=0
set /a MAX_WAIT=90

:WAIT_DOCKER_LOOP
timeout /t 3 /nobreak >nul 2>&1 || ping 127.0.0.1 -n 4 >nul
set /a WAIT_SECONDS+=3
docker info >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    echo.
    echo   [OK] Docker Engine da khoi dong va san sang sau !WAIT_SECONDS! giay!
    goto :DOCKER_READY
)

echo   ... Dang cho Docker Engine [!WAIT_SECONDS!s / !MAX_WAIT!s]
if !WAIT_SECONDS! LSS !MAX_WAIT! goto :WAIT_DOCKER_LOOP

echo.
echo [LOI] Docker Engine van chua san sang sau !MAX_WAIT! giay.
echo Vui long kiem tra Docker Desktop da duoc bat va khong bi loi WSL2/Hyper-V,
echo sau do chay lai file START-SKYDISH.bat.
goto :ERROR_EXIT

:DOCKER_READY
echo.

:: ==============================================================================
:: 6. Kiem tra tinh hop le cua docker-compose.yml
:: ==============================================================================
echo [BUOC 2/5] Xac thuc cau hinh docker-compose.yml...
docker compose config -q
if !ERRORLEVEL! NEQ 0 (
    echo [LOI] Cau hinh docker-compose.yml khong hop le!
    docker compose config
    goto :ERROR_EXIT
)
echo   - Cau hinh docker-compose.yml hop le.
echo.

:: ==============================================================================
:: 7. Build va khoi chay toan bo cac Container (docker compose up -d --build)
:: ==============================================================================
echo [BUOC 3/5] Build va khoi chay cac container (docker compose up -d --build)...
echo   [Qua trinh nay co the mat vai phut o lan chay dau tien hoac khi co thay doi code]
echo.
docker compose up -d --build
set "COMPOSE_EXIT_CODE=!ERRORLEVEL!"

if !COMPOSE_EXIT_CODE! NEQ 0 (
    echo.
    echo [LOI] Lenh 'docker compose up -d --build' gap loi khi khoi chay!
    goto :CHECK_CONTAINER_ERRORS
)

echo.
echo [BUOC 4/5] Cho cac dich vu khoi dong va kiem tra Health Check...
set /a HEALTH_WAIT=0
set /a MAX_HEALTH_WAIT=90

:WAIT_HEALTH_LOOP
timeout /t 3 /nobreak >nul 2>&1 || ping 127.0.0.1 -n 4 >nul
set /a HEALTH_WAIT+=3

:: Kiem tra xem co container nao bi chet hoac loi khong
set "HAS_ERROR_CONTAINERS="
for /f "tokens=*" %%C in ('docker compose ps --filter "status=exited" --filter "status=dead" -q 2^>nul') do (
    set "HAS_ERROR_CONTAINERS=1"
)
for /f "tokens=*" %%C in ('docker compose ps --filter "health=unhealthy" -q 2^>nul') do (
    set "HAS_ERROR_CONTAINERS=1"
)
if "!HAS_ERROR_CONTAINERS!"=="1" goto :CHECK_CONTAINER_ERRORS

:: Kiem tra xem con container nao dang o trang thai starting khong
set "STILL_STARTING="
for /f "tokens=*" %%C in ('docker compose ps --filter "health=starting" -q 2^>nul') do (
    set "STILL_STARTING=1"
)

if "!STILL_STARTING!"=="" goto :VERIFY_ALL_SERVICES

echo   ... Dang cho he thong on dinh [!HEALTH_WAIT!s / !MAX_HEALTH_WAIT!s]
if !HEALTH_WAIT! LSS !MAX_HEALTH_WAIT! goto :WAIT_HEALTH_LOOP

echo.
echo [CANH BAO] Mot so container van dang o trang thai khoi dong sau !MAX_HEALTH_WAIT! giay.

:CHECK_CONTAINER_ERRORS
echo.
echo ==============================================================================
echo                    BANG TRANG THAI CAC CONTAINER
echo ==============================================================================
docker compose ps
echo.
echo ==============================================================================
echo [CANH BAO / LOI] He thong phat hien co su co khi khoi dong container:
echo ==============================================================================
echo.
echo ------------------------------------------------------------------------------
echo LOGS 40 DONG GAN NHAT CUA CAC DICH VU:
echo ------------------------------------------------------------------------------
docker compose logs --tail=40
echo ------------------------------------------------------------------------------
echo.
echo [GOI Y KHAC PHUC SU CO PHO BIEN]:
echo 1. Neu gap loi 'ports are not available' hoac 'access permissions':
echo    - Nguyen nhan: Port bi Windows (Hyper-V / WinNAT) tam thoi chiem dung.
echo    - Cach 1: Mo CMD voi quyen Administrator va chay:
echo              net stop winnat ^&^& net start winnat
echo    - Cach 2: Chinh sua FRONTEND_PORT trong file .env sang port khac (vi du: 3300).
echo 2. Script tuan thu nguyen tac: KHONG tu y sua code du an khi script chay.
echo ==============================================================================
goto :ERROR_EXIT

:VERIFY_ALL_SERVICES
:: Kiem tra 7 containers bat buoc cua SkyDish
set "MISSING_SERVICE="
for %%S in (skydish-mongo skydish-auth-service skydish-restaurant-service skydish-order-service skydish-delivery-service skydish-payment-service skydish-frontend) do (
    set "SVC_FOUND="
    for /f "tokens=*" %%A in ('docker ps --filter "name=%%S" --filter "status=running" -q 2^>nul') do (
        set "SVC_FOUND=1"
    )
    if "!SVC_FOUND!"=="" (
        set "MISSING_SERVICE=%%S"
    )
)

if not "!MISSING_SERVICE!"=="" (
    echo.
    echo [LOI] Dich vu '!MISSING_SERVICE!' chua hoat dong hoac da dung dot ngot!
    goto :CHECK_CONTAINER_ERRORS
)

if "!COMPOSE_EXIT_CODE!" NEQ "0" (
    goto :CHECK_CONTAINER_ERRORS
)

:STARTUP_SUCCESS
echo.
echo ==============================================================================
echo             SKYDISH FOOD DELIVERY - KHOI DONG THANH CONG!
echo ==============================================================================
docker compose ps
echo.

:: ==============================================================================
:: 8. Thiet lap ngrok Tunnel tao Public URL cho Demo
:: ==============================================================================
echo [BUOC 5/5] Khoi tao ngrok tunnel tao Public URL cho demo...
set "NGROK_CMD="
where ngrok >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    set "NGROK_CMD=ngrok"
) else if exist "%LOCALAPPDATA%\Microsoft\WindowsApps\ngrok.exe" (
    set "NGROK_CMD=%LOCALAPPDATA%\Microsoft\WindowsApps\ngrok.exe"
) else if exist "%ProgramFiles%\ngrok\ngrok.exe" (
    set "NGROK_CMD=%ProgramFiles%\ngrok\ngrok.exe"
)

set "NGROK_URL="

if "!NGROK_CMD!"=="" (
    echo   [!] Khong tim thay ngrok tren he thong.
    echo   [!] Khong the tao Public URL tu dong.
    echo.
    echo   [HUONG DAN CAI DAT NGROK]:
    echo   1. Tai ngrok tu trang chu chinh thuc: https://ngrok.com/download
    echo   2. Dang ky tai khoan mien phi va lay authtoken.
    echo   3. Mo CMD va chay: ngrok config add-authtoken ^<TOKEN_CUA_BAN^>
    echo   4. Lan khoi dong sau, SkyDish se tu dong tao Public URL.
    echo.
    goto :PRINT_FINAL_URLS
)

:: Kiem tra xem ngrok da chay tu truoc chua
set "NGROK_REUSED="
tasklist /fi "imagename eq ngrok.exe" 2>nul | findstr /i "ngrok.exe" >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    echo   - Phat hien ngrok dang chay tu truoc. Dang kiem tra tunnel hien tai...
    powershell -NoProfile -Command "try { foreach ($tu in (Invoke-RestMethod -Uri 'http://127.0.0.1:4040/api/tunnels' -TimeoutSec 3).tunnels) { if ($tu.config.addr -like '*!FRONTEND_PORT!*') { $tu.public_url; break } } } catch {}" > .ngrok_url 2>nul
    if exist ".ngrok_url" (
        set /p NGROK_URL=<.ngrok_url
        del /f /q ".ngrok_url" >nul 2>&1
    )
    if not "!NGROK_URL!"=="" (
        echo   [OK] Su dung lai ngrok tunnel dang hoat dong tai cong !FRONTEND_PORT!.
        set "NGROK_REUSED=1"
    ) else (
        echo   - Tunnel cu khong phai cong !FRONTEND_PORT!. Dang khoi dong lai ngrok...
        taskkill /f /im ngrok.exe >nul 2>&1
        timeout /t 1 /nobreak >nul 2>&1 || ping 127.0.0.1 -n 2 >nul
    )
)

if "!NGROK_REUSED!"=="" (
    echo   - Dang khoi chay ngrok tunnel toi http://localhost:!FRONTEND_PORT!...
    start "SkyDish-ngrok" /min "!NGROK_CMD!" http !FRONTEND_PORT! --log=stdout
    echo   - Cho ngrok thiet lap duong truyen public [toi da 15 giay]...
    set /a NGROK_WAIT=0
    set /a MAX_NGROK_WAIT=15

    :WAIT_NGROK_LOOP
    timeout /t 2 /nobreak >nul 2>&1 || ping 127.0.0.1 -n 3 >nul
    set /a NGROK_WAIT+=2

    powershell -NoProfile -Command "try { (Invoke-RestMethod -Uri 'http://127.0.0.1:4040/api/tunnels' -TimeoutSec 3).tunnels[0].public_url } catch {}" > .ngrok_url 2>nul
    if exist ".ngrok_url" (
        set /p NGROK_URL=<.ngrok_url
        del /f /q ".ngrok_url" >nul 2>&1
    )

    if not "!NGROK_URL!"=="" goto :NGROK_READY
    if !NGROK_WAIT! LSS !MAX_NGROK_WAIT! goto :WAIT_NGROK_LOOP
)

:NGROK_READY
if not "!NGROK_URL!"=="" (
    echo   [OK] ngrok tunnel da duoc tao thanh cong!
) else (
    echo   [CANH BAO] Chua lay duoc Public URL tu ngrok sau 15 giay.
    echo   Vui long kiem tra authtoken ngrok hoac ket noi Internet.
)

:PRINT_FINAL_URLS
echo.
echo ==============================================================================
echo                      DUONG DAN TRUY CAP SKYDISH
echo ==============================================================================
echo.
echo   SKYDISH LOCAL:
echo   !FRONTEND_URL!
echo.
if not "!NGROK_URL!"=="" (
    echo   SKYDISH PUBLIC DEMO:
    echo   !NGROK_URL!
    echo.
    echo ------------------------------------------------------------------------------
    echo   CAC CONG CHUYEN DUNG [PUBLIC DEMO]:
    echo ------------------------------------------------------------------------------
    echo   [1] Giao dien khach hang [Customer]:     !NGROK_URL!
    echo   [2] Cong doi tac nha hang [Restaurant]:  !NGROK_URL!/restaurant/login
    echo   [3] Cong tai xe shipper [Delivery]:      !NGROK_URL!/delivery/login
    echo   [4] Cong quan tri vien [Super Admin]:    !NGROK_URL!/superadmin/login
    echo ------------------------------------------------------------------------------
) else (
    echo ------------------------------------------------------------------------------
    echo   CAC CONG CHUYEN DUNG [LOCAL]:
    echo ------------------------------------------------------------------------------
    echo   [1] Giao dien khach hang [Customer]:     !FRONTEND_URL!
    echo   [2] Cong doi tac nha hang [Restaurant]:  !FRONTEND_URL!/restaurant/login
    echo   [3] Cong tai xe shipper [Delivery]:      !FRONTEND_URL!/delivery/login
    echo   [4] Cong quan tri vien [Super Admin]:    !FRONTEND_URL!/superadmin/login
    echo ------------------------------------------------------------------------------
)
echo   LENH QUAN TRI CAN BIET:
echo   - Xem log truc tiep:     docker compose logs -f
echo   - Dung he thong:         Chay STOP-SKYDISH.bat hoac 'docker compose down'
echo   - Reset sach du lieu:    docker compose down -v
echo ==============================================================================
echo.
if not "!NGROK_URL!"=="" (
    echo [THONG BAO] Dang tu dong mo Public Demo URL: !NGROK_URL!
    start "" "!NGROK_URL!"
) else (
    echo [THONG BAO] Dang tu dong mo Local URL: !FRONTEND_URL!
    start "" "!FRONTEND_URL!"
)

echo.
echo Nhan phim bat ky de ket thuc [SkyDish va ngrok van tiep tuc chay ngam]...
pause >nul
exit /b 0

:ERROR_EXIT
echo.
echo ==============================================================================
echo                   KHOI DONG KHONG THANH CONG
echo ==============================================================================
echo Hay xem cac thong bao va huong dan ben tren de xu ly.
echo Nhan phim bat ky de dong cua so nay...
pause >nul
exit /b 1
