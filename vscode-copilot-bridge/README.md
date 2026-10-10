# AE Studio Copilot Bridge

The bridge runs inside VS Code and calls the selected user's signed-in GitHub Copilot model through the VS Code Language Model API. It does not require a Copilot API key. The CEP panel communicates with it over loopback at `127.0.0.1:43127`.

## Requirements

- VS Code 1.90 or later
- GitHub Copilot Chat available in VS Code
- The user signed in to GitHub and has Copilot access enabled
- Node.js is not required after the extension is installed

## Package and install

From the repository root in PowerShell:

```powershell
$bridge = Resolve-Path .\vscode-copilot-bridge
$vsix = Join-Path $env:TEMP 'ae-studio-copilot-bridge.vsix'
Push-Location $bridge
npx --yes @vscode/vsce package --no-dependencies --allow-missing-repository --skip-license --out $vsix
Pop-Location
code --install-extension $vsix
```

Reload VS Code if it asks. The bridge activates on startup. To run from source instead, open `vscode-copilot-bridge` as a VS Code folder and press F5 using the included launch configuration.

## Verify the bridge and Copilot account

In PowerShell, check that the local bridge is available:

```powershell
Invoke-RestMethod http://127.0.0.1:43127/health | ConvertTo-Json -Depth 5
```

The response should include `ok: true` and a non-empty `copilotModels` list. `provider` may name a local model if one is also running; select `provider: copilot` to use GitHub Copilot explicitly.

To test Copilot without sending project content:

```powershell
$body = @{
    provider = 'copilot'
    model = 'auto'
    messages = @(@{ role = 'user'; content = 'Reply with exactly: AE_STUDIO_COPILOT_OK' })
} | ConvertTo-Json -Depth 5

Invoke-RestMethod http://127.0.0.1:43127/v1/chat/completions `
    -Method Post -ContentType 'application/json' -Body $body
```

## Connect After Effects

1. Open the AE Studio CEP panel in After Effects.
2. Open **Settings**, choose **Use VS Code Copilot**, then **Save connection**.
3. Choose **Agent** to plan, request approval, execute, and verify AE changes, or **Script** for a complete ExtendScript workflow that still requires approval.

When the Copilot provider is selected, the panel sends the current project summary and conversation to the user's Copilot session. Do not select it for projects whose content must remain offline.