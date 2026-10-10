$code = Get-Command code -ErrorAction SilentlyContinue
if (-not $code) { Write-Error "VS Code CLI 'code' was not found. Install VS Code or add it to PATH."; exit 1 }
$hadi = (Resolve-Path (Join-Path $PSScriptRoot "..\hadi")).Path
$bridge = (Resolve-Path (Join-Path $PSScriptRoot ".\vscode-copilot-bridge")).Path
Write-Host "Starting HADI and AE Studio bridge in a new VS Code Extension Development Host..."
Write-Host "Sign in/configure HADI in the new window, then refresh models in After Effects."
& $code.Source --extensionDevelopmentPath=$hadi --extensionDevelopmentPath=$bridge
