@echo off
echo ===================================================
echo   Stopping SkyDish Food Delivery Microservices
echo ===================================================

powershell -NoProfile -ExecutionPolicy Bypass -Command "Write-Host 'Stopping processes on ports 27000, 4000, 5002, 5003, 5004, 5005, 3000...'; Get-NetTCPConnection -LocalPort 27000,4000,5002,5003,5004,5005,3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { try { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue; Write-Host \"Killed process ID: $_\" } catch {} }"

echo.
echo All SkyDish services have been stopped.
pause
