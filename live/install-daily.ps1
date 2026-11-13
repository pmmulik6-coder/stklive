# One-time setup: run go-live.ps1 every day at a fixed time (Windows Task Scheduler, as you, while you are logged in).
#   powershell -ExecutionPolicy Bypass -File install-daily.ps1 -At 20:00 -Minutes 235
# Remove later with:  Unregister-ScheduledTask -TaskName StackBallLive -Confirm:$false
param([string]$At = "20:00", [int]$Minutes = 235)
$script = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) 'go-live.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Minimized -File `"$script`" -Minutes $Minutes"
$trigger = New-ScheduledTaskTrigger -Daily -At $At
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -WakeToRun -ExecutionTimeLimit (New-TimeSpan -Hours 5)
Register-ScheduledTask -TaskName 'StackBallLive' -Action $action -Trigger $trigger -Settings $settings -Description "Daily Stack Ball live stream ($Minutes min)" -Force | Out-Null
Write-Host "Scheduled: every day at $At for $Minutes minutes."
Write-Host "Test it right now with:  Start-ScheduledTask -TaskName StackBallLive"
