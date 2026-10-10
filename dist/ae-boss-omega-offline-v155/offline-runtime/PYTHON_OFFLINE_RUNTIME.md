# Python Offline Runtime

v32 uses only Python standard-library modules (`hashlib`, `json`, `sys`, `time`, `pathlib` where applicable). No third-party packages are required.

For Windows deployment, install a local Python 3.x interpreter once, or place a compatible `python.exe` alongside the extension and set `AE_BOSS_PYTHON` to its path. v32 does not download Python, wheels, packages, or models at runtime.
