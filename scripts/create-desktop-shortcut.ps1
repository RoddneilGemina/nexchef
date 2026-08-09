$desktop = [System.Environment]::GetFolderPath('Desktop')
$exePath = "C:\Users\Admin\Documents\Projects\nexchef\Start-NexChef.exe"
$desktopExe = Join-Path $desktop "Start NexChef.exe"

# 1. Copy executable to Desktop
Copy-Item $exePath -Destination $desktopExe -Force
Write-Host "Copied executable to: $desktopExe" -ForegroundColor Green

# 2. Create desktop shortcut (.lnk)
$shortcutPath = Join-Path $desktop "Start NexChef Dev.lnk"
$wsh = New-Object -ComObject WScript.Shell
$sc = $wsh.CreateShortcut($shortcutPath)
$sc.TargetPath = $exePath
$sc.WorkingDirectory = "C:\Users\Admin\Documents\Projects\nexchef"
$sc.Description = "Launch NexChef Antigravity and Expo Start terminals in one click"
$sc.Save()
Write-Host "Created Desktop shortcut at: $shortcutPath" -ForegroundColor Green
