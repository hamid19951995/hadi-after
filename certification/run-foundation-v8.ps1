[CmdletBinding()]
param([switch]$NoCleanup)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$root = Split-Path -Parent $PSScriptRoot
Push-Location $root
try {
  Write-Host 'AE BOSS Omega Foundation v8 certification' -ForegroundColor Cyan
  node --version
  npm --version
  npm test
  if ($LASTEXITCODE -ne 0) { throw "Node certification failed with exit code $LASTEXITCODE" }
  Write-Host 'FOUNDATION V8 NODE CERTIFICATION: PASS' -ForegroundColor Green
  Write-Host 'LIVE AFTER EFFECTS CERTIFICATION: NOT CLAIMED' -ForegroundColor Yellow
} finally { Pop-Location }
