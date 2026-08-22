@echo off
echo Starting VetriScan AI (React + FastAPI)...
echo.

echo [1/2] Starting Backend (FastAPI) on port 8000...
start "VetriScan Backend" cmd /k "cd /d D:\vetriiii\vetriscai-react\backend && python -m uvicorn main:app --reload --port 8000"

timeout /t 3 /nobreak > nul

echo [2/2] Starting Frontend (React) on port 3000...
start "VetriScan Frontend" cmd /k "cd /d D:\vetriiii\vetriscai-react\frontend && npm run dev"

timeout /t 5 /nobreak > nul

echo.
echo Both services started!
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:8000
echo.
start http://localhost:3000
