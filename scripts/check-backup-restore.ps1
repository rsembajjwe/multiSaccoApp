param(
    [string]$ProjectName = "saccoapp-backup-rehearsal",
    [int]$PostgresPort = 15435,
    [string]$OutputDirectory = "backups/rehearsals"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$previousLocation = Get-Location
$composeStarted = $false
$powerShellExecutable = if ($PSVersionTable.PSEdition -eq "Core") { "pwsh" } else { "powershell" }

function Invoke-Checked {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Command,
        [Parameter(Mandatory = $true)]
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

function Invoke-Postgres {
    param([string]$Sql)

    Invoke-Checked docker @(
        "compose", "-p", $ProjectName,
        "exec", "-T", "postgres",
        "psql", "-U", $env:POSTGRES_USER, "-d", $env:POSTGRES_DB,
        "-v", "ON_ERROR_STOP=1",
        "-c", $Sql
    )
}

function Wait-ForPostgres {
    $deadline = (Get-Date).AddMinutes(2)
    do {
        docker compose -p $ProjectName exec -T postgres pg_isready -U $env:POSTGRES_USER -d $env:POSTGRES_DB *> $null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "PostgreSQL is ready for backup rehearsal."
            return
        }
        Start-Sleep -Seconds 2
    } while ((Get-Date) -lt $deadline)

    throw "PostgreSQL did not become ready for backup rehearsal."
}

try {
    Set-Location $repoRoot

    if (-not (Test-DockerReady)) {
        throw "Docker is installed, but the Docker engine is not running. Start Docker Desktop, then rerun npm.cmd run backup:rehearse."
    }

    $env:POSTGRES_DB = "sacco_app_backup_rehearsal"
    $env:POSTGRES_USER = "sacco_backup"
    $env:POSTGRES_PASSWORD = "sacco_backup_password"
    $env:POSTGRES_PORT = "$PostgresPort"

    Write-Host "Starting isolated backup rehearsal database: $ProjectName"
    Invoke-Checked docker @("compose", "-p", $ProjectName, "up", "-d", "postgres")
    $composeStarted = $true

    Wait-ForPostgres

    $marker = "restore-marker-$([Guid]::NewGuid().ToString("N"))"
    Invoke-Postgres "CREATE TABLE IF NOT EXISTS backup_restore_rehearsal (id text primary key, created_at timestamptz not null default now());"
    Invoke-Postgres "INSERT INTO backup_restore_rehearsal (id) VALUES ('$marker');"

    Write-Host "Creating rehearsal backup"
    & $powerShellExecutable -ExecutionPolicy Bypass -File scripts/backup-postgres.ps1 -OutputDirectory $OutputDirectory -ProjectName $ProjectName
    if ($LASTEXITCODE -ne 0) {
        throw "Backup script failed during rehearsal."
    }

    $latestBackup = Get-ChildItem -LiteralPath $OutputDirectory -Filter "sacco_app_backup_rehearsal-*.dump" |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
    if (-not $latestBackup) {
        throw "Rehearsal backup file was not created in $OutputDirectory."
    }

    Invoke-Postgres "DROP TABLE backup_restore_rehearsal;"

    Write-Host "Restoring rehearsal backup"
    & $powerShellExecutable -ExecutionPolicy Bypass -File scripts/restore-postgres.ps1 -BackupPath $latestBackup.FullName -ConfirmRestore -ProjectName $ProjectName
    if ($LASTEXITCODE -ne 0) {
        throw "Restore script failed during rehearsal."
    }

    $count = docker compose -p $ProjectName exec -T postgres psql -U $env:POSTGRES_USER -d $env:POSTGRES_DB -t -A -c "SELECT COUNT(*) FROM backup_restore_rehearsal WHERE id = '$marker';"
    if ($LASTEXITCODE -ne 0 -or "$count".Trim() -ne "1") {
        throw "Restore rehearsal failed: marker row was not restored."
    }

    Write-Host "Backup restore rehearsal passed with $($latestBackup.FullName)"
} finally {
    Set-Location $repoRoot
    if ($composeStarted) {
        Write-Host "Stopping isolated backup rehearsal database: $ProjectName"
        docker compose -p $ProjectName down -v
    }
    Remove-Item Env:\POSTGRES_DB -ErrorAction SilentlyContinue
    Remove-Item Env:\POSTGRES_USER -ErrorAction SilentlyContinue
    Remove-Item Env:\POSTGRES_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:\POSTGRES_PORT -ErrorAction SilentlyContinue
    Set-Location $previousLocation
}
