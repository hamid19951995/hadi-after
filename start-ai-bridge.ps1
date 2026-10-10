$bridge = Join-Path $PSScriptRoot "vscode-copilot-bridge\ollama-standalone.js"
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCommand) { Write-Error "Node.js is required for the AE Studio local AI bridge."; exit 1 }
$existing = Get-NetTCPConnection -LocalPort 43127 -State Listen -ErrorAction SilentlyContinue
if ($existing) { Write-Host "AE Studio AI bridge is already running on 127.0.0.1:43127"; exit 0 }
if (-not $env:AE_STUDIO_REPOSITORY_ROOT) { $env:AE_STUDIO_REPOSITORY_ROOT = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path }
Start-Process -FilePath $nodeCommand.Source -ArgumentList "`"$bridge`"" -WorkingDirectory (Split-Path $bridge) -WindowStyle Hidden
Write-Host "AE Studio AI bridge started on 127.0.0.1:43127"
