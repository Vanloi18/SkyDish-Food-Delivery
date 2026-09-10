@echo off
echo ===================================================
echo   Starting SkyDish Food Delivery Microservices
echo ===================================================

echo [1/7] Starting MongoDB Runner (Port 27000)...
start "SkyDish - MongoDB (Port 27000)" cmd /k "cd /d %~dp0mongo-runner && node start-mongo.js"
timeout /t 3 /nobreak >nul

echo [2/7] Starting Auth Service (Port 4000)...
start "SkyDish - Auth Service (Port 4000)" cmd /k "cd /d %~dp0backend\auth-service && node server.js"

echo [3/7] Starting Restaurant Service (Port 5002)...
start "SkyDish - Restaurant Service (Port 5002)" cmd /k "cd /d %~dp0backend\restaurant-service && node src/server.js"

echo [4/7] Starting Delivery Service (Port 5003)...
start "SkyDish - Delivery Service (Port 5003)" cmd /k "cd /d %~dp0delivery-service\backend && node src/server.js"

echo [5/7] Starting Payment Service (Port 5004)...
start "SkyDish - Payment Service (Port 5004)" cmd /k "cd /d %~dp0backend\payment-service && node server.js"

echo [6/7] Starting Order Service (Port 5005)...
start "SkyDish - Order Service (Port 5005)" cmd /k "cd /d %~dp0backend\order-service && node index.js"

echo [7/7] Starting Frontend (Port 3000)...
start "SkyDish - Frontend (Port 3000)" cmd /k "cd /d %~dp0frontend && npm start"

echo.
echo ===================================================
echo   All services have been launched!
echo   Frontend URL: http://localhost:3000
echo ===================================================
pause
