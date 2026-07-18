param(
    [string]$OutputDirectory = "backups",
    [string]$ProjectName = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

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
$fileName = "$database-$timestamp.dump"
$remotePath = "/tmp/$fileName"

New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$localPath = Join-Path $OutputDirectory $fileName

$composeArgs = @("compose")
if ($ProjectName) {
    $composeArgs += @("-p", $ProjectName)
}

$dockerArgs = $composeArgs + @("exec", "-T", "postgres", "pg_dump", "-U", $user, "-d", $database, "-Fc", "-f", $remotePath)
Invoke-Checked docker $dockerArgs
$dockerArgs = $composeArgs + @("cp", "postgres:$remotePath", $localPath)
Invoke-Checked docker $dockerArgs
$dockerArgs = $composeArgs + @("exec", "-T", "postgres", "rm", "-f", $remotePath)
Invoke-Checked docker $dockerArgs

Write-Host "Backup created: $localPath"
