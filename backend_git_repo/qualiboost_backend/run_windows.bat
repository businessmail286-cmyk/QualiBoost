@echo off
setlocal
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  py -m venv .venv
)
call ".venv\Scripts\python.exe" -m pip install --upgrade pip
call ".venv\Scripts\python.exe" -m pip install -r requirements-api.txt
echo.
echo Starting QualiBoost API at http://127.0.0.1:8000
echo First enhancement may take longer while Real-ESRGAN downloads model weights.
call ".venv\Scripts\python.exe" -m uvicorn app:app --host 127.0.0.1 --port 8000
pause
