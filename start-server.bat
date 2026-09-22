@echo off
title ResQHub Crisis Command Server
cd /d "%~dp0"
echo =======================================================
echo   Starting ResQHub Disaster Management Wi-Fi Server...
echo =======================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
pause
