param(
    [Parameter(Mandatory = $true)]
    [string]$BackupPath,

    [switch]$ConfirmRestore
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-ComposeEnvValue {
    param(
        [string]$Name,
        [string]$DefaultValue
    )

    $environmentValue = [Environment]::GetEnvironmentVariable($Name)
    if ($environmentValue) {
        return $environmentValue
    }

    $envFile = Join-Path (Get-Location) ".env"
    if (Test-Path -LiteralPath $envFile) {
        $line = Get-Content -LiteralPath $envFile |
            Where-Object { $_ -match "^\s*$Name\s*=" } |
            Select-Object -First 1
        if ($line) {
            return ($line -replace "^\s*$Name\s*=\s*", "").Trim().Trim('"').Trim("'")
        }
    }

    return $DefaultValue
}

if (-not $ConfirmRestore) {
    throw "Restore is destructive. Re-run with -ConfirmRestore after verifying the backup path."
}

$resolvedBackup = Resolve-Path -LiteralPath $BackupPath
if (-not $resolvedBackup) {
    throw "Backup file not found: $BackupPath"
}

$database = Get-ComposeEnvValue -Name "POSTGRES_DB" -DefaultValue "sacco_app"
$user = Get-ComposeEnvValue -Name "POSTGRES_USER" -DefaultValue "sacco"
$remotePath = "/tmp/restore-sacco-app.dump"

docker compose cp $resolvedBackup.Path "postgres:$remotePath"
docker compose exec -T postgres pg_restore -U $user -d $database --clean --if-exists $remotePath
docker compose exec -T postgres rm -f $remotePath

Write-Host "Restore completed from: $($resolvedBackup.Path)"
