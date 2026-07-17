param(
    [string]$OutputDirectory = "backups"
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

$database = Get-ComposeEnvValue -Name "POSTGRES_DB" -DefaultValue "sacco_app"
$user = Get-ComposeEnvValue -Name "POSTGRES_USER" -DefaultValue "sacco"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$fileName = "sacco_app-$timestamp.dump"
$remotePath = "/tmp/$fileName"

New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$localPath = Join-Path $OutputDirectory $fileName

docker compose exec -T postgres pg_dump -U $user -d $database -Fc -f $remotePath
docker compose cp "postgres:$remotePath" $localPath
docker compose exec -T postgres rm -f $remotePath

Write-Host "Backup created: $localPath"
