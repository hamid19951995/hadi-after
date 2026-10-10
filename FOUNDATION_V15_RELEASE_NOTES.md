# Foundation v15 — Resilient Autonomous Production Runtime

## Added
- Declarative multi-layer job manifests.
- Deterministic execution plans and SHA-256 job fingerprints.
- Dry-run planning without mutating After Effects.
- Bounded per-step retries with checkpoint persistence.
- Resume-safe completed-step tracking.
- Render completion watchdog polling.
- Stronger manifest validation and normalized layer definitions.

## Operational note
Actual `.aep` mutation and rendering still require the Adobe After Effects host/bridge to be running and authorized. The Node runtime does not emulate After Effects rendering.
