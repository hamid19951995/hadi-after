param([string]$Root = $PSScriptRoot)
$ErrorActionPreference = "Stop"
& (Join-Path $Root "setup-offline-python.ps1") -Root $Root
& (Join-Path $Root "install-dev.ps1")
Write-Host "AE BOSS OMEGA v31.1 Offline Core installed."
