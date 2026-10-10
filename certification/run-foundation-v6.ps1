[CmdletBinding()]
param([switch]$Strict)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$Root=Split-Path -Parent $PSScriptRoot
Write-Host '=== AE BOSS Ω Foundation v6 Certification ==='
$tests=@(
 'test\aepipe.test.js','test\ae-runtime\ae-runtime-v4.test.js','test\foundation\aepipe-foundation-v2.test.js','test\foundation\foundation-v2-1.test.js','test\foundation-v5\foundation-v5.test.js','test\foundation-v6\foundation-v6.test.js'
)
foreach($t in $tests){$p=Join-Path $Root $t;if(!(Test-Path -LiteralPath $p)){throw "TEST_MISSING:$t"};node $p;if($LASTEXITCODE-ne 0){throw "TEST_FAILED:$t"}}
Write-Host 'Foundation v6 local certification: PASS'
if($Strict){Write-Host 'Strict mode: Real After Effects certification remains separate and requires live host evidence.'}
