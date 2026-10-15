@echo off
setlocal
cd /d "%~dp0"

echo Starting BlockFit backend on http://localhost:4000...
start "BlockFit API" cmd /k "npm.cmd run dev:api"

echo Starting BlockFit web app on http://localhost:5173...
start "BlockFit Web" cmd /k "npm.cmd run dev:web"

echo.
echo BlockFit is starting. Open http://localhost:5173
endlocal
