@echo off
title SkillBridge Server
echo ========================================================
echo   Starting SkillBridge Web Application and Web Services
echo ========================================================
echo.
cd /d "%~dp0"

echo Activating Python virtual environment...
if not exist ".venv\Scripts\python.exe" (
    echo Error: .venv not found. Creating virtual environment...
    python -m venv .venv
    call .venv\Scripts\activate.bat
    pip install -r requirements.txt
    python seed_data.py
)

echo.
echo Server starting at http://127.0.0.1:8000
echo Swagger API Docs: http://127.0.0.1:8000/docs
echo.
echo Launching your browser automatically...
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://127.0.0.1:8000"
echo.
echo Press CTRL+C in this window anytime to stop the server.
echo.

".venv\Scripts\python.exe" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause
