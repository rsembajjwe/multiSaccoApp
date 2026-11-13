param(
  [Parameter(Mandatory = $true)]
  [string]$Path,
  [switch]$OverrideExisting
)

$ErrorActionPreference = "Stop"

if (!(Test-Path -LiteralPath $Path -PathType Leaf)) {
  return
}

$lineNumber = 0
foreach ($rawLine in Get-Content -LiteralPath $Path) {
  $lineNumber++
  $line = $rawLine.Trim()
  if (!$line -or $line.StartsWith("#")) {
    continue
  }
  if ($line.StartsWith("export ")) {
    $line = $line.Substring(7).TrimStart()
  }

  $separator = $line.IndexOf("=")
  if ($separator -lt 1) {
    throw "Invalid .env entry at ${Path}:$lineNumber. Expected NAME=VALUE."
  }

  $name = $line.Substring(0, $separator).Trim()
  if ($name -notmatch "^[A-Za-z_][A-Za-z0-9_]*$") {
    throw "Invalid environment variable name at ${Path}:$lineNumber."
  }

  if (!$OverrideExisting -and [Environment]::GetEnvironmentVariable($name, "Process") -ne $null) {
    continue
  }

  $value = $line.Substring($separator + 1).Trim()
  if ($value.Length -ge 2) {
    $first = $value[0]
    $last = $value[$value.Length - 1]
    if (($first -eq '"' -and $last -eq '"') -or ($first -eq "'" -and $last -eq "'")) {
      $value = $value.Substring(1, $value.Length - 2)
    }
  }

  [Environment]::SetEnvironmentVariable($name, $value, "Process")
}
