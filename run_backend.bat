@echo off
echo Starting Backend UGC Automation...
cd /d "%~dp0backend"

if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)

echo Activating virtual environment...
call venv\Scripts\activate

echo Installing/Updating dependencies...
call pip install -r requirements.txt

echo Starting FastAPI server on http://localhost:8000
call uvicorn main:app --reload --port 8000
pause
