param(
    [string]$Destination = "$env:APPDATA\Adobe\CEP\extensions\com.cepresources.aechat"
)

$source = (Resolve-Path (Join-Path $PSScriptRoot ".")).Path
$parent = Split-Path $Destination -Parent

New-Item -ItemType Directory -Force -Path $parent | Out-Null
if ((Resolve-Path $source).Path -eq (Resolve-Path $Destination -ErrorAction SilentlyContinue).Path) {
    Write-Host "Source and destination are the same folder. Nothing to copy."
    exit 0
}

New-Item -ItemType Directory -Force -Path $Destination | Out-Null
Copy-Item -Path (Join-Path $source "CSXS") -Destination $Destination -Recurse -Force
Copy-Item -Path (Join-Path $source "css") -Destination $Destination -Recurse -Force
Copy-Item -Path (Join-Path $source "html") -Destination $Destination -Recurse -Force
Copy-Item -Path (Join-Path $source "js") -Destination $Destination -Recurse -Force
Copy-Item -Path (Join-Path $source "jsx") -Destination $Destination -Recurse -Force
foreach ($optionalDirectory in @("assets", "host", "test")) {
    $optionalPath = Join-Path $source $optionalDirectory
    if (Test-Path $optionalPath) {
        Copy-Item -Path $optionalPath -Destination $Destination -Recurse -Force
    }
}
Write-Host "AE Studio Chat installed to $Destination"
Write-Host "Enable CEP PlayerDebugMode manually, restart After Effects, then open Window > Extensions > AE Studio Chat."
$launcher = Join-Path $source "start-ai-bridge.ps1"
if (Get-Command node -ErrorAction SilentlyContinue) {
    & $launcher
} else {
    Write-Warning "Node.js is not installed; local AI providers will show Bridge not found. Install Node.js LTS, then run start-ai-bridge.ps1."
}
