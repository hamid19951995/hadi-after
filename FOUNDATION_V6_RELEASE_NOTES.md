# AE BOSS Ω Foundation v6 — Autonomous Execution Orchestrator

Base: Foundation v5 — Governed Control Plane.

Major upgrade:
- Autonomous bounded execution queue
- Durable operation journal with integrity verification
- Crash recovery scanner and requeue path
- Capability Registry with fail-closed action admission
- Host Heartbeat / stale-host circuit gate
- Scoped approval tokens with TTL/revocation
- Idempotency store for replay protection
- Tamper-evident per-operation event ledger
- Windows certification runner for full regression suite

Certification status:
- Local Node regression: PASS when Foundation v6 runner completes
- Real After Effects certification: NOT CLAIMED until live host execution produces independently verified evidence
