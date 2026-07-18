param(
  [int]$BackendPort = 18084,
  [int]$UiPort = 5174,
  [switch]$DisableDemoLogins
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $root "backend-java"
$logsDir = Join-Path $root "logs"
$pidsDir = Join-Path $root ".local-pids"

New-Item -ItemType Directory -Force -Path $logsDir | Out-Null
New-Item -ItemType Directory -Force -Path $pidsDir | Out-Null

function Stop-RecordedProcess($Name) {
  $pidPath = Join-Path $pidsDir "$Name.pid"
  if (!(Test-Path $pidPath)) { return }
  $recordedPid = [int](Get-Content $pidPath -Raw)
  $process = Get-Process -Id $recordedPid -ErrorAction SilentlyContinue
  if ($process) {
    Stop-Process -Id $recordedPid -Force -ErrorAction SilentlyContinue
  }
  Remove-Item $pidPath -Force -ErrorAction SilentlyContinue
}

function Test-PortOpen($Port) {
  return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

function Wait-ForJsonHealth($Url, $Label) {
  $deadline = (Get-Date).AddSeconds(120)
  $lastError = ""
  while ((Get-Date) -lt $deadline) {
    try {
      $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 4
      if ($response.StatusCode -eq 200) { return }
    } catch {
      $lastError = $_.Exception.Message
    }
    Start-Sleep -Seconds 2
  }
  throw "$Label did not become healthy at $Url. $lastError"
}

function Test-UiLogin($UiPort) {
  $staffBody = @{
    saccoCode = "GVS"
    username = "treasurer@greenvalley.local"
    password = "Treasurer@12345"
  } | ConvertTo-Json
  $memberBody = @{
    saccoCode = "GVS"
    identifier = "GVS-0001"
    password = "Member@12345"
  } | ConvertTo-Json

  $staff = Invoke-RestMethod `
    -Method Post `
    -Uri "http://127.0.0.1:$UiPort/api/v1/auth/login" `
    -ContentType "application/json" `
    -Body $staffBody `
    -TimeoutSec 15
  if ($staff.data.user.email -ne "treasurer@greenvalley.local") {
    throw "Connected UI staff login smoke test returned the wrong account."
  }

  $member = Invoke-RestMethod `
    -Method Post `
    -Uri "http://127.0.0.1:$UiPort/api/v1/member-auth/login" `
    -ContentType "application/json" `
    -Body $memberBody `
    -TimeoutSec 15
  if ($member.data.member.membershipNo -ne "GVS-0001") {
    throw "Connected UI member login smoke test returned the wrong account."
  }
}

Stop-RecordedProcess "ui-$UiPort"
Stop-RecordedProcess "backend-$BackendPort"

if (Test-PortOpen $BackendPort) {
  Write-Host "Backend port $BackendPort is already in use; reusing existing backend."
} else {
  $backendOut = Join-Path $logsDir "java-backend-$BackendPort.out.log"
  $backendErr = Join-Path $logsDir "java-backend-$BackendPort.err.log"
  $demoValue = if ($DisableDemoLogins) { "false" } else { "true" }
  $backendCommand = @"
`$env:SERVER_PORT='$BackendPort'
`$env:SACCO_DEMO_LOGINS_ENABLED='$demoValue'
Set-Location '$backendDir'
.\mvnw.cmd spring-boot:run
"@
  $backendProcess = Start-Process -FilePath powershell.exe `
    -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $backendCommand) `
    -WindowStyle Hidden `
    -RedirectStandardOutput $backendOut `
    -RedirectStandardError $backendErr `
    -PassThru
  Set-Content -Path (Join-Path $pidsDir "backend-$BackendPort.pid") -Value $backendProcess.Id
}

Wait-ForJsonHealth "http://127.0.0.1:$BackendPort/api/v1/health" "Java backend"

if (Test-PortOpen $UiPort) {
  Write-Host "UI port $UiPort is already in use. If it is stale, choose another port with -UiPort."
} else {
  $uiOut = Join-Path $logsDir "ui-$UiPort.out.log"
  $uiErr = Join-Path $logsDir "ui-$UiPort.err.log"
  $uiCommand = @"
`$env:PORT='$UiPort'
`$env:JAVA_API_BASE='http://127.0.0.1:$BackendPort'
Set-Location '$root'
node server.mjs
"@
  $uiProcess = Start-Process -FilePath powershell.exe `
    -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $uiCommand) `
    -WindowStyle Hidden `
    -RedirectStandardOutput $uiOut `
    -RedirectStandardError $uiErr `
    -PassThru
  Set-Content -Path (Join-Path $pidsDir "ui-$UiPort.pid") -Value $uiProcess.Id
}

Wait-ForJsonHealth "http://127.0.0.1:$UiPort/api/v1/health" "Connected UI proxy"
Test-UiLogin $UiPort

Write-Host ""
Write-Host "Tereka Online is connected to the Java backend."
Write-Host "UI:      http://127.0.0.1:$UiPort/"
Write-Host "Backend: http://127.0.0.1:$BackendPort/api/v1"
Write-Host "Demo logins enabled: $(-not $DisableDemoLogins)"
