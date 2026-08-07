@echo off
setlocal
set "PROJECT_DIR=%~dp0"
if "%PROJECT_DIR:~-1%"=="\" set "PROJECT_DIR=%PROJECT_DIR:~0,-1%"

echo Launching Windows Terminal with tabs for Antigravity and Expo Start...

:: Open Windows Terminal with tab 1 (Antigravity) and tab 2 (Expo Start)
wt -title "Antigravity" -d "%PROJECT_DIR%" cmd /k "where antigravity >nul 2>&1 && antigravity || agy" ; new-tab -title "Expo Start" -d "%PROJECT_DIR%" cmd /k "npx expo start"

endlocal
