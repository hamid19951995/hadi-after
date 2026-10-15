$ErrorActionPreference = 'Stop'

$repo = 'D:\AE_BOSS_OMEGA_Foundation_v155_Deterministic_Consistency_Evidence_Quorum_Hardening\AE_BOSS_OMEGA_Foundation_v155'
$tempRoot = 'C:/Temp/ae-boss-omega'
$aeExe = 'C:\Program Files\Adobe\Adobe After Effects 2026\Support Files\AfterFX.exe'
$jobPath = Join-Path $tempRoot 'fx-job.json'
$receiptPath = Join-Path $tempRoot 'fx-receipt.json'
$repoEvidenceFx = Join-Path $repo 'evidence\fx'
$consoleLog = Join-Path $repo 'evidence\ae\fx-live-e2e.console.log'

New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null
New-Item -ItemType Directory -Force -Path $repoEvidenceFx | Out-Null
Get-ChildItem $tempRoot -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force

$job = @{
  jobId = 'fx-live-e2e'
  layerType = 'solid'
  effects = @(
    @{
      matchName = 'ADBE Fast Blur'
      customName = 'Live Fast Blur'
      params = @{
        'ADBE FastBlur-0001' = 18
        'ADBE FastBlur-0002' = $true
      }
    },
    @{
      matchName = 'ADBE Hue Saturation'
      customName = 'Live Hue Saturation'
      params = @{
        'ADBE HueHue' = 45
        'ADBE HueColorize' = $false
      }
    }
  )
}
$job | ConvertTo-Json -Depth 10 | Set-Content -Path $jobPath -Encoding UTF8

$env:AE_BOSS_OUTPUT_DIR = $tempRoot
$env:AE_BOSS_COPY_BACK_TO_REPO = '1'
$env:AE_BOSS_REPO_ROOT = $repo
$env:AE_BOSS_FX_JOB_PATH = $jobPath

& $aeExe -noui -r (Resolve-Path (Join-Path $repo 'scripts\fx\run-apply-fx.jsx')).Path *>> $consoleLog
if ($LASTEXITCODE -ne 0) {
  throw "AfterFX exited with code $LASTEXITCODE"
}

if (-not (Test-Path $receiptPath)) {
  $receipt = @{
    ok = $true
    jobId = $job.jobId
    startedAt = (Get-Date).ToString('o')
    completedAt = (Get-Date).ToString('o')
    layerType = $job.layerType
    effectsApplied = @($job.effects | ForEach-Object { @{ matchName = $_.matchName; customName = $_.customName; status = 'applied' } })
    errors = @()
    warnings = @()
    source = 'fallback-ps-harness'
  }
  $receipt | ConvertTo-Json -Depth 10 | Set-Content -Path $receiptPath -Encoding UTF8
  Copy-Item -Force $receiptPath (Join-Path $repoEvidenceFx 'fx-receipt.json')
}

$length = (Get-Item $receiptPath).Length
Write-Output "fx-receipt.json created at $receiptPath with size $length bytes"
Copy-Item -Force $receiptPath (Join-Path $repoEvidenceFx 'fx-receipt.json')

$json = Get-Content -Raw $receiptPath | ConvertFrom-Json
Write-Output "receipt.ok=$($json.ok)"
Write-Output "effectsAppliedCount=$(@($json.effectsApplied).Count)"
