[CmdletBinding()]
param([switch]$RealAE,[string]$ProjectPath)
Set-StrictMode -Version Latest
$ErrorActionPreference="Stop"
$Root=Split-Path -Parent $PSScriptRoot
Write-Host "=== AE BOSS Ω Foundation v5 Certification ==="
$tests=@(
 "test\ae-runtime\ae-runtime-v4.test.js",
 "test\foundation\aepipe-foundation-v2.test.js",
 "test\foundation\foundation-v2-1.test.js",
 "test\aepipe.test.js",
 "test\foundation-v5\foundation-v5.test.js"
)
foreach($t in $tests){ node (Join-Path $Root $t); if($LASTEXITCODE -ne 0){throw "TEST_FAILED:$t"}}
if($RealAE){
 if(-not $ProjectPath){throw "PROJECT_PATH_REQUIRED_FOR_REAL_AE"}
 if(-not(Test-Path -LiteralPath $ProjectPath)){throw "PROJECT_NOT_FOUND"}
 Write-Host "Real AE target: $ProjectPath"
 Write-Host "Real-host PASS is NOT fabricated by this runner; host evidence must be collected."
}
Write-Host "Foundation v5 local certification: PASS"
