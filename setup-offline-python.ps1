param([string]$Python = "python", [string]$Root = $PSScriptRoot)
$ErrorActionPreference = "Stop"
$py = Get-Command $Python -ErrorAction SilentlyContinue
if (-not $py) { throw "A local Python interpreter is required. No internet download is performed by this setup script." }
$version = & $py.Source -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}')"
$major = [int]((& $py.Source -c "import sys; print(sys.version_info.major)"))
$minor = [int]((& $py.Source -c "import sys; print(sys.version_info.minor)"))
if ($major -lt 3 -or ($major -eq 3 -and $minor -lt 10)) { throw "Python 3.10+ is required; found $version" }
$venv = Join-Path $Root ".venv"
if (-not (Test-Path (Join-Path $venv "Scripts\python.exe"))) {
    & $py.Source -m venv --without-pip $venv
    if ($LASTEXITCODE -ne 0) { throw "Local venv creation failed." }
}
$runtime = Join-Path $Root "offline-runtime\offline_engine.py"
& (Join-Path $venv "Scripts\python.exe") $runtime '{"op":"health"}'
if ($LASTEXITCODE -ne 0) { throw "Offline engine health check failed." }
Write-Host "Offline Python runtime ready: $version"
Write-Host "No packages were downloaded. requirements.txt is intentionally empty."
