# AE BOSS Omega Foundation v17 — Observable Resilient Autonomous Runtime

## Added
- Atomic durable checkpoint persistence
- Idempotent completed-job reuse using deterministic plan fingerprints
- Resume protection against incompatible checkpoint fingerprints
- Per-step exponential bounded backoff
- Cooperative cancellation via AbortSignal
- Runtime event stream for job/step lifecycle and retries
- Active-step runtime status visibility
- v17 certification test

## Production boundary
Real `.aep` mutation and rendering still execute only through a connected, licensed Adobe After Effects host/bridge.
