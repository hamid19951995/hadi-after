[CmdletBinding()]
param()
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
node (Join-Path $Root "test\foundation\aepipe-foundation-v2.test.js")
if ($LASTEXITCODE -ne 0) { throw "Foundation v2 tests failed." }
Write-Host "AE BOSS Ω Foundation v2 tests PASSED." -ForegroundColor Green
