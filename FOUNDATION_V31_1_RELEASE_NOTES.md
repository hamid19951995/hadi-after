# Foundation v31.1 Release Notes

## Offline Core + Local Python Runtime

v31.1 hardens the v31 Character + Prop Intelligence release around an offline-first execution model.

### Included
- deterministic Python stdlib-only Offline Core
- local JSONL runtime protocol
- offline intent inference
- action-plan compilation/validation
- prop-plan validation
- project audit and fingerprint utilities
- Windows offline setup script that never downloads Python packages
- UI Offline Core mode enabled by default
- explicit blocking of network-dependent search/download/media commands while Offline Core is enabled
- local Python integration through CEP's Node.js runtime
- additional regression tests

### Verification
- Offline Python engine: PASS
- Node integration syntax: PASS
- Existing v31 regression suite: to be run in this release build
- Live Adobe After Effects host execution: not claimable in this environment
