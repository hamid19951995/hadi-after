[CmdletBinding()] param()
Set-StrictMode -Version Latest; $ErrorActionPreference="Stop"; $Root=Split-Path -Parent $PSScriptRoot; Push-Location $Root
try { if(-not(Get-Command node -ErrorAction SilentlyContinue)){throw "Node.js is required."}; node .\test\foundation\foundation-v2-1.test.js; if($LASTEXITCODE -ne 0){throw "Foundation v2.1 certification tests failed."}; Write-Host "AE BOSS Ω Foundation v2.1 certification gate: PASS" -ForegroundColor Green } finally { Pop-Location }
