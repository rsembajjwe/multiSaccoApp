param(
    [Parameter(Mandatory = $true)]
    [string]$BackupPath,

    [switch]$ConfirmRestore,

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

$composeArgs = @("compose")
if ($ProjectName) {
    $composeArgs += @("-p", $ProjectName)
}

$dockerArgs = $composeArgs + @("cp", $resolvedBackup.Path, "postgres:$remotePath")
Invoke-Checked docker $dockerArgs
$dockerArgs = $composeArgs + @("exec", "-T", "postgres", "pg_restore", "-U", $user, "-d", $database, "--clean", "--if-exists", $remotePath)
Invoke-Checked docker $dockerArgs
$dockerArgs = $composeArgs + @("exec", "-T", "postgres", "rm", "-f", $remotePath)
Invoke-Checked docker $dockerArgs

Write-Host "Restore completed from: $($resolvedBackup.Path)"
