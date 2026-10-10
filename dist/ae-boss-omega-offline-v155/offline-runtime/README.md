# AE BOSS OMEGA Offline Runtime

The Offline Core is deterministic and network-free. It uses only Python's standard library.

## Windows
Run `setup-offline-python.ps1` once. The script does not download packages and creates `.venv` only when a local Python interpreter is already installed.

## Direct test
`python offline-runtime/offline_engine.py` reads JSONL from stdin and emits JSONL to stdout.

## Supported operations
- `health`
- `infer`
- `compile_action_plan`
- `validate_action_plan`
- `validate_prop_plan`
- `audit`
- `fingerprint`

No cloud AI, browser API, HTTP client, pip package, or external endpoint is used by this core.
