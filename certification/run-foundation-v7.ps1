[CmdletBinding()]
param(
  [switch]$Strict,
  [switch]$NoZip
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$Root=Split-Path -Parent $PSScriptRoot
$ProjectRoot=Split-Path -Parent $Root
Write-Host '=== AE BOSS Ω Foundation v7 Certification ==='
Push-Location $ProjectRoot
try {
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'NODE_REQUIRED' }
  node --version
  npm test
  if ($LASTEXITCODE -ne 0) { throw 'NODE_CERTIFICATION_FAILED' }
  Write-Host 'Local Foundation v7 certification: PASS'
  Write-Host 'Live After Effects certification: NOT CLAIMED'
  if ($Strict) {
    Write-Host 'Strict mode: inspect and run the live AE harness separately on the target Windows + After Effects installation.'
  }
} finally { Pop-Location }
