param(
    [string]$InstallRoot = "D:\AE-Studio-MediaTools"
)

$ErrorActionPreference = "Stop"

function Require-Command([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "$Name is required. Install it and run this script again."
    }
}

$freeC = (Get-PSDrive -Name C).Free / 1GB
if ($freeC -lt 8) {
    throw "At least 8 GB free space is required on C:. Available: $([math]::Round($freeC, 1)) GB."
}

New-Item -ItemType Directory -Force -Path $InstallRoot | Out-Null
$pythonRoot = Join-Path $InstallRoot "python"
New-Item -ItemType Directory -Force -Path $pythonRoot | Out-Null

$choco = Get-Command choco -ErrorAction SilentlyContinue
if (-not $choco) { throw "Chocolatey is required for FFmpeg. Install Chocolatey first." }

Write-Host "Installing FFmpeg..."
& $choco.Source install ffmpeg -y --no-progress
if ($LASTEXITCODE -ne 0) { throw "FFmpeg installation failed with exit code $LASTEXITCODE." }

Require-Command python
Write-Host "Creating isolated Python environment at $pythonRoot..."
& python -m venv $pythonRoot
if ($LASTEXITCODE -ne 0) { throw "Python virtual environment creation failed." }

$python = Join-Path $pythonRoot "Scripts\python.exe"
& $python -m pip install --upgrade pip
& $python -m pip install faster-whisper piper-tts
if ($LASTEXITCODE -ne 0) { throw "Speech package installation failed." }

$envFile = Join-Path $InstallRoot "media-tools.env.ps1"
@"
`$env:AE_STUDIO_MEDIA_ROOT = "$InstallRoot"
`$env:AE_STUDIO_STT_ENGINE = "faster-whisper"
`$env:AE_STUDIO_TTS_ENGINE = "piper"
`$env:AE_STUDIO_FFMPEG = "ffmpeg"
# Configure these only when using remote media providers:
# `$env:AE_STUDIO_IMAGE_ENDPOINT = "https://..."
# `$env:AE_STUDIO_IMAGE_KEY = "..."
# `$env:AE_STUDIO_VIDEO_ENDPOINT = "https://..."
# `$env:AE_STUDIO_VIDEO_KEY = "..."
"@ | Set-Content -Encoding ASCII $envFile

Write-Host "Media tools installed. Load configuration with:"
Write-Host ". `"$envFile`""
Write-Host "Speech engines: faster-whisper (STT), Piper (TTS)."
