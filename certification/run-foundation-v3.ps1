[CmdletBinding()]
param()
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$Test = Join-Path $Root "test\ae-runtime\ae-runtime-v3.test.js"

Write-Host "=== AE BOSS Ω Foundation v3 Certification ==="
Write-Host "Node test: $Test"
node $Test
if ($LASTEXITCODE -ne 0) {
  throw "CERTIFICATION_FAILED"
}
Write-Host "CERTIFICATION RESULT: PASS"
