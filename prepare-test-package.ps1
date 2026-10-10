param(
    [string]$OutputDirectory = (Join-Path (Split-Path $PSScriptRoot -Parent) "dist")
)

$source = (Resolve-Path $PSScriptRoot).Path
$packageRoot = Join-Path $OutputDirectory "AE-Studio-AI-CEP-Test"
$zipPath = Join-Path $OutputDirectory "AE-Studio-AI-CEP-Test.zip"

if (Test-Path $packageRoot) {
    Remove-Item -Path $packageRoot -Recurse -Force
}
if (Test-Path $zipPath) {
    Remove-Item -Path $zipPath -Force
}

New-Item -ItemType Directory -Force -Path $packageRoot | Out-Null
foreach ($directory in @("CSXS", "css", "html", "js", "jsx", "assets", "host", "test")) {
    $path = Join-Path $source $directory
    if (Test-Path $path) {
        Copy-Item -Path $path -Destination $packageRoot -Recurse -Force
    }
}

Compress-Archive -Path (Join-Path $packageRoot "*") -DestinationPath $zipPath -CompressionLevel Optimal
Write-Host "CEP test package created: $zipPath"
Write-Host "Install with: powershell -ExecutionPolicy Bypass -File `"$source\install-dev.ps1`""
Write-Host "Then start the bridge with: powershell -ExecutionPolicy Bypass -File `"$source\start-ai-bridge.ps1`""
