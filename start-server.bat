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

set "CF_BIN="
if exist "cloudflared.exe" set "CF_BIN=cloudflared.exe"
if not defined CF_BIN if exist "..\cloudflared.exe" set "CF_BIN=..\cloudflared.exe"

if not defined CF_BIN (
    echo [2/3] First-time setup on new laptop: Downloading Cloudflare 4G/5G Tunnel...
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'cloudflared.exe'"
    if exist "cloudflared.exe" set "CF_BIN=cloudflared.exe"
)

if defined CF_BIN (
    if exist "tunnel.log" del /f /q "tunnel.log" >nul 2>&1
    echo [2/3] Launching Public 4G/5G Mobile Tunnel (cloudflared over HTTP2)...
    start "EPICENTER Mobile Tunnel" cmd /k "%CF_BIN% tunnel --protocol http2 --logfile tunnel.log --url http://localhost:8080"
)

echo [3/3] Opening Admin Command Console in Browser...
start http://localhost:8080/index.html

echo.
echo ====================================================================
echo   READY!
echo   - Admin Console: http://localhost:8080/index.html
echo     (User ID: ResQhub  ^|  Password: 25082007)
echo   - Citizen Phone Portal: http://localhost:8080/user.html
echo     (Or scan the QR code on the Admin Console for the 4G/5G link!)
echo ====================================================================
pause
