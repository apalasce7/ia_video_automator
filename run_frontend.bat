@echo off
echo Starting Frontend UGC Dashboard...
cd /d "%~dp0frontend"

if not exist node_modules (
    echo Installing dependencies, this might take a minute...
    call npm install
)

echo Starting Next.js development server...
call npm run dev
pause
