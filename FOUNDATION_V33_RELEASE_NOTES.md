# AE BOSS OMEGA Foundation v33 — Intelligent Production Execution

v33 extends v32 without removing the offline production intelligence layer.

## Added
- Deterministic local execution lifecycle
- Execution Job state machine
- Ordered operation execution from compiled production plans
- Tamper-evident hash-chained execution journal
- Queue abstraction for future multi-job orchestration
- Checkpoint events during execution
- Dry-run execution boundary for safe validation outside Adobe After Effects
- Explicit ExtendScript adapter boundary for future live AE execution

## Validation boundary
Node execution tests can validate plan execution semantics and journaling, but do not claim live execution inside Adobe After Effects.
