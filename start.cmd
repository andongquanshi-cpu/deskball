@echo off
cd /d "%~dp0"
if not exist node_modules\electron\dist\electron.exe (
  echo Please run npm install in this folder first.
  pause
  exit /b 1
)
set ELECTRON_RUN_AS_NODE=
start "Todo Orb" "node_modules\electron\dist\electron.exe" .
