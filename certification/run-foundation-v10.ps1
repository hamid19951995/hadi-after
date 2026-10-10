$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
$root=Split-Path -Parent $PSScriptRoot
Push-Location $root
try { node test/foundation-v10.test.js; if($LASTEXITCODE -ne 0){throw "Foundation v10 certification failed"}; Write-Host "AE BOSS Omega Foundation v10 certification PASS" } finally { Pop-Location }
