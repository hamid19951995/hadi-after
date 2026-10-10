# AE BOSS OMEGA v31.1 — Offline Core

## Guarantees
The production core does not require internet access. By default the panel starts in **Offline Core** mode. No cloud API, web search, remote model endpoint, or download service is called by the default execution path.

## Python runtime
- `offline-runtime/offline_engine.py` — stdlib-only deterministic engine.
- `offline-runtime/requirements.txt` — intentionally empty.
- `offline-runtime/runtime-policy.json` — declares network policy and dependency contract.
- `setup-offline-python.ps1` — creates a local `.venv` using an already-installed Python interpreter. It does not run pip and does not download anything.

Python 3.10+ is supported by the Offline Core. For Windows deployments, the official Python project also provides embeddable distributions that can be bundled by a deployment pipeline; this release does not fabricate a binary that was not present in the build environment.

## Offline capabilities
1. Rig/action/prop plan validation.
2. Deterministic Action Library compilation and fingerprints.
3. Character + Prop state validation.
4. Persian/English local intent inference for the supported action/prop vocabulary.
5. Project source audit and JSON integrity checking.
6. Local JSONL protocol for deterministic integration tests.

## Explicit online mode
Cloud/local provider integrations remain available as optional features. They are never required for the deterministic AE BOSS core. Selecting `Offline Core` or leaving Offline Core enabled prevents network-dependent media/search operations from executing.
