# Foundation v6 Orchestration Contract

Foundation v6 adds an explicit execution plane above Foundation v5.

## Admission gates
1. Operation identity + idempotency key
2. Capability admission (fail closed)
3. Host heartbeat freshness
4. Expected post-state for mutating commands
5. Scoped approval token (TTL + revocation)
6. Existing v5 lease and controller verification

## Durability
Every operation writes NDJSON journal records containing the operation scope, expected state, lifecycle event and a SHA-256 integrity record.

## Crash semantics
A persisted operation observed in `RUNNING` or `RECOVERING` is not blindly retried. It enters reconciliation. Without a host reconciliation adapter, the correct result is `RECOVERY_REQUIRED` rather than an unsafe duplicate mutation.

## Host discovery
The AE host bridge exposes `capabilities` and `heartbeat` commands. These are read-only and designed to support future live orchestration adapters.
