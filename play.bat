@echo off
cd /d "%~dp0"
python scripts/serve.py
if errorlevel 1 pause
