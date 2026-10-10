# v32 Offline Deployment

1. Install Python locally with `setup-offline-python.ps1` (no pip download is performed).
2. Keep `offline-runtime/offline_engine_v32.py` beside the extension.
3. Open After Effects with the CEP extension installed.
4. Verify `AEBossProduction.health` and `networkPolicy` report offline operation.
5. Run `npm test` for the local regression suite.

v32 does not require an internet connection for its core runtime.
