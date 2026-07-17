param(
  [string]$ProjectName = "saccoapp-postgres-check",
  [int]$PostgresPort = 15432,
  [int]$BackendPort = 18080
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$previousLocation = Get-Location
$composeStarted = $false

function Wait-ForBackend {
  $healthUrl = "http://127.0.0.1:$BackendPort/api/v1/health"
  $deadline = (Get-Date).AddMinutes(3)
  do {
    try {
      $response = Invoke-RestMethod -Uri $healthUrl -Method Get -TimeoutSec 5
      if ($response.data.ok -eq $true) {
        Write-Host "Backend health is ready at $healthUrl"
        return
      }
    } catch {
      Start-Sleep -Seconds 3
    }
  } while ((Get-Date) -lt $deadline)

  throw "Java backend did not become healthy at $healthUrl"
}

function Invoke-Checked {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Command,
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Arguments
  )

  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed with exit code $LASTEXITCODE`: $Command $($Arguments -join ' ')"
  }
}

function Test-DockerReady {
  $job = Start-Job -ScriptBlock {
    docker info *> $null
    return $LASTEXITCODE
  }
  try {
    if (Wait-Job $job -Timeout 20) {
      $exitCode = Receive-Job $job
      return $exitCode -eq 0
    }
    Stop-Job $job -ErrorAction SilentlyContinue
    return $false
  } finally {
    Remove-Job $job -Force -ErrorAction SilentlyContinue
  }
}

try {
  Set-Location $repoRoot

  if (-not (Test-DockerReady)) {
    throw "Docker is installed, but the Docker engine is not running. Start Docker Desktop, then rerun npm.cmd run postgres:check."
  }

  $env:POSTGRES_DB = "sacco_app_check"
  $env:POSTGRES_USER = "sacco_check"
  $env:POSTGRES_PASSWORD = "sacco_check_password"
  $env:POSTGRES_PORT = "$PostgresPort"
  $env:BACKEND_PORT = "$BackendPort"
  $env:SACCO_DEMO_LOGINS_ENABLED = "true"

  Write-Host "Starting isolated Docker Compose stack: $ProjectName"
  Invoke-Checked docker compose -p $ProjectName up -d --build postgres backend
  $composeStarted = $true

  Wait-ForBackend

  Write-Host "Confirming Flyway schema history in PostgreSQL"
  Invoke-Checked docker compose -p $ProjectName exec -T postgres psql -U $env:POSTGRES_USER -d $env:POSTGRES_DB -c "select installed_rank, version, script, success from flyway_schema_history order by installed_rank;"

  $env:API_BASE_URL = "http://127.0.0.1:$BackendPort/api/v1"
  $env:API_SMOKE_WAIT_MS = "60000"
  $env:SKIP_RATE_LIMIT_TEST = "1"

  Write-Host "Running Java/PostgreSQL API smoke test"
  Invoke-Checked node scripts/api-smoke-test.mjs

  Remove-Item Env:\SKIP_RATE_LIMIT_TEST -ErrorAction SilentlyContinue

  Write-Host "Running security hardening checks"
  Invoke-Checked node scripts/check-security-hardening.mjs

  Write-Host "PostgreSQL integration verification passed."
} finally {
  Set-Location $repoRoot
  if ($composeStarted) {
    Write-Host "Stopping isolated Docker Compose stack: $ProjectName"
    docker compose -p $ProjectName down -v
  }
  Set-Location $previousLocation
}
