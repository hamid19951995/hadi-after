[CmdletBinding()]
param(
  [switch]$RealAE,
  [string]$ProjectPath
)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
Write-Host "=== AE BOSS Ω Foundation v4 Certification ==="

node (Join-Path $Root "test\ae-runtime\ae-runtime-v4.test.js")
if ($LASTEXITCODE -ne 0) { throw "NODE_CERTIFICATION_FAILED" }

if ($RealAE) {
  Write-Host "Real AE mode requested."
  if (-not $ProjectPath) { throw "PROJECT_PATH_REQUIRED_FOR_REAL_AE" }
  if (-not (Test-Path -LiteralPath $ProjectPath)) { throw "PROJECT_NOT_FOUND" }
  Write-Host "Golden project target: $ProjectPath"
  Write-Host "Host certification requires AE bridge + After Effects to be running."
  Write-Host "The script does not fabricate a PASS when host evidence is absent."
}

Write-Host "Foundation v4 local protocol certification: PASS"
