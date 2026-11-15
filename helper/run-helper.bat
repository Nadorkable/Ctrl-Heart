@echo off
REM Ctrl+Heart laptop-wide mode (Windows). Double-click to run. Close the window to stop.
cd /d "%~dp0"

set "PY=%LOCALAPPDATA%\Programs\Python\Python313\python.exe"
if not exist "%PY%" set "PY=py -3"

if not exist ".venv\Scripts\python.exe" (
  echo First run: setting up the helper, one moment...
  %PY% -m venv .venv || goto :fail
  ".venv\Scripts\python.exe" -m pip install --quiet -r requirements.txt || goto :fail
)

".venv\Scripts\python.exe" ctrlheart_helper.py
pause
exit /b

:fail
echo.
echo Setup failed. Is Python installed? (python.org, tick "Add to PATH")
pause
