# Daily stream runner: commentary server -> wait for the voice -> OBS starts streaming -> stop after the set time.
# Run by hand:   powershell -ExecutionPolicy Bypass -File go-live.ps1            (default 235 min = 3 h 55 min)
# Or schedule:   powershell -ExecutionPolicy Bypass -File install-daily.ps1 -At 20:00
param(
  [int]$Minutes = 235,
  [string]$ObsPath = "C:\Program Files\obs-studio\bin\64bit\obs64.exe",
  [string]$Scene = ""
)
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$logDir = Join-Path $here 'data\logs'
New-Item -ItemType Directory -Force $logDir | Out-Null
$stamp = Get-Date -Format 'yyyy-MM-dd_HHmm'
$log = Join-Path $logDir "stream_$stamp.log"
function Log($m) { $line = "$(Get-Date -Format 'HH:mm:ss') $m"; Write-Host $line; Add-Content -Path $log -Value $line -Encoding utf8 }

# keep the PC and screen awake for the whole stream
Add-Type -Namespace Win -Name Power -MemberDefinition '[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint f);'
[Win.Power]::SetThreadExecutionState([uint32]"0x80000003") | Out-Null

$node = (Get-Command node -ErrorAction Stop).Source
function Start-Server {
  $s = Get-Date -Format 'HHmmss'
  Start-Process -FilePath $node -ArgumentList 'server.js' -WorkingDirectory $here -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput (Join-Path $logDir "server_${stamp}_$s.log") -RedirectStandardError (Join-Path $logDir "server_${stamp}_$s.err.log")
}
function Start-Obs {
  if (-not (Test-Path $ObsPath)) { throw "OBS not found at $ObsPath (pass -ObsPath)" }
  $obsArgs = @('--startstreaming', '--minimize-to-tray', '--disable-shutdown-check')
  if ($Scene) { $obsArgs += @('--scene', "`"$Scene`"") }
  Start-Process -FilePath $ObsPath -ArgumentList $obsArgs -WorkingDirectory (Split-Path $ObsPath) -PassThru
}

Log "starting commentary server"
$server = Start-Server
$deadline = (Get-Date).AddMinutes(4)
do {
  Start-Sleep 5
  try { $st = Invoke-RestMethod 'http://127.0.0.1:8787/state' -TimeoutSec 5 } catch { $st = $null }
} until (($st -and $st.voiceReady) -or (Get-Date) -gt $deadline)
if ($st -and $st.voiceReady) { Log "voice loaded" } else { Log "voice not ready after 4 min - going live anyway (check server logs)" }

Log "starting OBS (streaming) for $Minutes minutes"
$obs = Start-Obs
$end = (Get-Date).AddMinutes($Minutes)
while ((Get-Date) -lt $end) {
  Start-Sleep 30
  if ($server.HasExited) { Log "server stopped unexpectedly - restarting it"; $server = Start-Server }
  if ($obs.HasExited) { Log "OBS closed unexpectedly - restarting the stream"; Start-Sleep 5; $obs = Start-Obs }
}

Log "time is up - stopping the stream"
& $node (Join-Path $here 'obs-control.js') stop | ForEach-Object { Log "obs: $_" }
Start-Sleep 8
if (-not $obs.HasExited) { $obs.CloseMainWindow() | Out-Null; Start-Sleep 15 }
if (-not $obs.HasExited) { Stop-Process -Id $obs.Id -Force }
if (-not $server.HasExited) { Stop-Process -Id $server.Id -Force }
# the Kokoro voice runs as its own Python process (~1 GB RAM): make sure it never outlives the stream
Get-CimInstance Win32_Process -Filter "Name='python.exe'" | Where-Object { $_.CommandLine -like '*kokoro_worker.py*' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
[Win.Power]::SetThreadExecutionState([uint32]"0x80000000") | Out-Null
Log "done"
