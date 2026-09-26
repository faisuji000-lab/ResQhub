@echo off
title EPICENTER (ResQHub) - SIH 2026 Command Server
cd /d "%~dp0"
echo ====================================================================
echo   EPICENTER (ResQHub) - Smart India Hackathon 2026
echo   Starting Live EOC Backend Server (Port 8080) and Public Tunnel...
echo ====================================================================
echo.
echo [1/3] Launching Python Backend Server on http://localhost:8080 ...
start "EPICENTER Backend Server (Port 8080)" cmd /k "python server.py"

timeout /t 2 /nobreak >nul

if exist "..\cloudflared.exe" (
    echo [2/3] Launching Public 4G/5G Mobile Tunnel (cloudflared over HTTP2)...
    start "EPICENTER Mobile Tunnel" cmd /k "..\cloudflared.exe tunnel --protocol http2 --url http://localhost:8080"
)

echo [3/3] Opening Admin Command Console in Browser...
start http://localhost:8080/index.html

echo.
echo ====================================================================
echo   READY!
echo   - Admin Console: http://localhost:8080/index.html
echo     (User ID: ResQhub  ^|  Password: 25082007)
echo   - Citizen Phone Portal: http://localhost:8080/user.html
echo     (Or check the "EPICENTER Mobile Tunnel" window for the https://*.trycloudflare.com link!)
echo ====================================================================
pause
