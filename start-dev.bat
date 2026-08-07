@echo off
setlocal
:: Set working directory to the directory where this script is located
set "PROJECT_DIR=%~dp0"
if "%PROJECT_DIR:~-1%"=="\" set "PROJECT_DIR=%PROJECT_DIR:~0,-1%"

echo Starting development environment for nexchef...
echo Project Directory: %PROJECT_DIR%

:: 1. Launch terminal window for Antigravity
start "Antigravity CLI" cmd /k "cd /d "%PROJECT_DIR%" && (where antigravity >nul 2>&1 && antigravity || agy)"

:: 2. Launch terminal window for Expo Start
start "Expo Server" cmd /k "cd /d "%PROJECT_DIR%" && npx expo start"

endlocal
