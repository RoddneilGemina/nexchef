# PowerShell script to launch Antigravity and Expo Start in separate windows
$projectDir = $PSScriptRoot

Write-Host "Starting development environment for nexchef..." -ForegroundColor Cyan
Write-Host "Project Directory: $projectDir" -ForegroundColor Yellow

# Determine Antigravity CLI executable command
$antigravityCmd = if (Get-Command antigravity -ErrorAction SilentlyContinue) { "antigravity" } else { "agy" }

# 1. Launch terminal for Antigravity
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$projectDir'; Write-Host 'Starting Antigravity...' -ForegroundColor Green; $antigravityCmd"

# 2. Launch terminal for Expo Start
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$projectDir'; Write-Host 'Starting Expo Server...' -ForegroundColor Green; npx expo start"
