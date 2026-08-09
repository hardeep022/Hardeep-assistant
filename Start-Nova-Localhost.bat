@echo off
title Hardeep Assistant — 1-Click Localhost Launcher
color 0A
echo ===================================================
echo   Hardeep Assistant — Launching Local Server & Web UI
echo ===================================================
echo.
echo Starting Vite Dev Server on http://localhost:5173...
start /b npm run dev
timeout /t 3 /nobreak >nul
echo Opening http://localhost:5173 in default browser...
start http://localhost:5173
echo.
echo Hardeep Assistant is running at http://localhost:5173
echo Press Ctrl+C in this window to stop the server anytime.
echo ===================================================
