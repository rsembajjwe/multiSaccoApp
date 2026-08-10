param(
  [string]$ContainerName = "saccoapp-redis-ha-check",
  [int]$HostPort = 16379
)

$ErrorActionPreference = "Stop"
if (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue) {
  $PSNativeCommandUseErrorActionPreference = $false
}
$repoRoot = Split-Path -Parent $PSScriptRoot
$redisUrl = "redis://127.0.0.1:$HostPort/0"
$containerStarted = $false

function Invoke-Checked {
  param(
    [string]$Command,
    [string[]]$Arguments
  )
  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed with exit code $LASTEXITCODE`: $Command $($Arguments -join ' ')"
  }
}

try {
  try {
    & docker info *> $null
    if ($LASTEXITCODE -ne 0) {
      throw "docker-info-failed"
    }
  } catch {
    throw "Docker is installed, but the Docker engine is not running. Start Docker Desktop, then rerun npm.cmd run ha:redis-check."
  }

  try {
    docker rm -f $ContainerName *> $null
  } catch {
    # The pre-cleanup container may not exist; that is fine.
  }
  Write-Host "Starting isolated Redis HA state smoke container: $ContainerName"
  Invoke-Checked docker @(
    "run", "--rm", "-d",
    "--name", $ContainerName,
    "-p", "127.0.0.1:$HostPort`:6379",
    "redis:7-alpine"
  )
  $containerStarted = $true

  $ready = $false
  for ($i = 0; $i -lt 30; $i++) {
    docker exec $ContainerName redis-cli ping *> $null
    if ($LASTEXITCODE -eq 0) {
      $ready = $true
      break
    }
    Start-Sleep -Seconds 1
  }
  if (-not $ready) {
    throw "Redis did not become ready for HA state smoke testing."
  }

  Write-Host "Running Redis-backed rate-limit and idempotency smoke test against $redisUrl"
  Push-Location "$repoRoot\backend-java"
  try {
    Invoke-Checked ".\mvnw.cmd" @(
      "-Dtest=RedisSharedStateSmokeTest",
      "-Dsacco.redis.url=$redisUrl",
      "test"
    )
  } finally {
    Pop-Location
  }

  Write-Host "Redis HA shared-state smoke test passed."
} finally {
  if ($containerStarted) {
    Write-Host "Stopping isolated Redis HA state smoke container: $ContainerName"
    docker rm -f $ContainerName *> $null
  }
}
