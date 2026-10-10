# Foundation v20 — Transactional & Tamper-Evident Autonomous Runtime

## Highlights
- Hash-chained, append-only execution journal with integrity verification.
- Intent/commit/abort records for every job and step.
- Fencing-token propagation into every production step.
- Pre-flight journal integrity check that blocks tampered job histories.
- Transactional rollback hook on failure.
- Explicit lease release in all terminal paths.

## Production boundary
Actual `.aep` mutation and rendering remain delegated to a licensed Adobe After Effects host/bridge.
