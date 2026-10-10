# AE BOSS OMEGA Foundation v16 — Production-Grade Autonomous Runtime

## New
- Persistent atomic file checkpoints and resume support
- Deterministic job fingerprints
- Per-step retry with bounded backoff
- Cooperative cancellation
- Runtime metrics/status
- Output verification hook after real Render Queue completion
- Production job template and v16 certification test

## Operational boundary
Actual `.aep` mutation and rendering still occur only through a configured, licensed Adobe After Effects host/bridge. This package adds orchestration resilience around that real host rather than pretending to render AE projects itself.
