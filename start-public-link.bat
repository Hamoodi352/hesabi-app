@echo off
setlocal
cd /d "%~dp0"

echo ============================================
echo  Hesabi - Public Link Starter
echo ============================================
echo.

taskkill /IM node.exe /F >nul 2>nul
taskkill /IM cloudflared.exe /F >nul 2>nul

echo [1/2] Starting local app server...
start "Hesabi Server" cmd /k "cd /d %~dp0 && node server.js"

timeout /t 2 >nul

echo [2/2] Starting Cloudflare public tunnel...
echo.
echo IMPORTANT:
echo - A new public link will appear in the next window.
echo - Copy the https://...trycloudflare.com link and send it on WhatsApp.
echo - Keep both windows open while using the app.
echo.
start "Hesabi Public Link" cmd /k "\"C:\Program Files (x86)\cloudflared\cloudflared.exe\" tunnel --url http://127.0.0.1:4173 --protocol http2 --no-autoupdate"

echo Done. Check the two opened windows.
echo.
pause

