$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$root = Split-Path -Parent $PSScriptRoot
Push-Location $root
try {
  Write-Host '== AE BOSS Ω Foundation v9 Certification =='
  npm test
  if ($LASTEXITCODE -ne 0) { throw 'Node certification failed.' }
  npm run certify:v9
  if ($LASTEXITCODE -ne 0) { throw 'v9 bridge certification failed.' }
  Write-Host 'Node/Bridge certification: PASS'
  Write-Host 'Live After Effects certification requires executing test/real-ae-smoke.jsx inside After Effects.'
} finally { Pop-Location }
