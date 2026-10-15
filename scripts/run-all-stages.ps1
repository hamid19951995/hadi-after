param(
  [switch]$LiveAE = $false
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Get-Location).Path
$startTime = Get-Date
$report = [ordered]@{}
$report.stages = @()

function run-step($name, $script, $args) {
  $entry = [ordered]@{}
  $entry.name = $name
  $entry.startTime = (Get-Date).ToString('o')
  try {
    Write-Host "[pipeline] Running $name..."
    & $script @args
    $entry.status = 'passed'
    $entry.error = $null
  } catch {
    $entry.status = 'failed'
    $entry.error = $_.Exception.Message
  }
  $entry.endTime = (Get-Date).ToString('o')
  $entry.durationMs = ([int]((Get-Date $entry.endTime) - (Get-Date $entry.startTime)).TotalMilliseconds)
  return $entry
}

# Sequential execution with early exit on failure
$halt = $false

# Stage 3 tests
if (-not $halt) {
  $st3 = run-step 'stage-3-unit-tests' 'node' @('test/job-schema.test.js')
  $report.stages += $st3
  if ($st3.status -ne 'passed') { $halt = $true }
}
if (-not $halt) {
  $st3b = run-step 'stage-3-engine-happy' 'node' @('test/engine-happy-path.test.js')
  $report.stages += $st3b
  if ($st3b.status -ne 'passed') { $halt = $true }
}
if (-not $halt) {
  $st3c = run-step 'stage-3-engine-negative' 'node' @('test/engine-negative-invalid-job.test.js')
  $report.stages += $st3c
  if ($st3c.status -ne 'passed') { $halt = $true }
}

# Stage 10 simulation
if (-not $halt) {
  $st10 = run-step 'stage-10-sim' 'node' @('test/simulate-stage10-bridge.js')
  $report.stages += $st10
  if ($st10.status -ne 'passed') { $halt = $true }
}

# Stage 11 simulation
if (-not $halt) {
  $st11 = run-step 'stage-11-sim' 'node' @('test/simulate-stage11-batch.js')
  $report.stages += $st11
  if ($st11.status -ne 'passed') { $halt = $true }
}

# Optional live AE runs
if (-not $halt -and $LiveAE) {
  $aePath = 'C:\\Program Files\\Adobe\\Adobe After Effects 2026\\Support Files\\AfterFX.exe'
  if (Test-Path $aePath) {
    $st10live = run-step 'stage-10-live' 'node' @('scripts/run-stage10-live-e2e.js')
    $report.stages += $st10live
    if ($st10live.status -ne 'passed') { $halt = $true }

    if (-not $halt) {
      $st11live = run-step 'stage-11-live' 'node' @('scripts/run-stage11-batch.js')
      $report.stages += $st11live
      if ($st11live.status -ne 'passed') { $halt = $true }
    }
  } else {
    $report.stages += ([ordered]@{ name='stage-10-live'; status='skipped'; startTime=(Get-Date).ToString('o'); endTime=(Get-Date).ToString('o'); durationMs=0; error='After Effects not found at expected path' })
    $report.stages += ([ordered]@{ name='stage-11-live'; status='skipped'; startTime=(Get-Date).ToString('o'); endTime=(Get-Date).ToString('o'); durationMs=0; error='After Effects not found at expected path' })
  }
}

# Finalize report
$report.completedAt = (Get-Date).ToString('o')
$report.durationMs = ([int]((Get-Date) - $startTime).TotalMilliseconds)

# Collect receipts if present
$report.receipts = @{}
$glob = Get-ChildItem -Path (Join-Path (Join-Path $repoRoot 'evidence') 'ae') -Recurse -Filter 'receipt.json' -ErrorAction SilentlyContinue
foreach ($r in $glob) {
  $rel = $r.FullName.Substring($repoRoot.Length+1)
  $report.receipts[$rel] = (Get-Content $r.FullName -Raw)
}

# Ensure evidence dir
$outDir = Join-Path (Join-Path $repoRoot 'evidence') 'pipeline'
if (!(Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }
$reportPath = Join-Path $outDir 'health-report.json'
$report | ConvertTo-Json -Depth 10 | Out-File -FilePath $reportPath -Encoding utf8
Write-Host "Health report written to $reportPath"

if ($report.stages | Where-Object { $_.status -eq 'failed' }) { exit 2 } else { exit 0 }
