# AE BOSS Ω Foundation v6 — Autonomous Execution Orchestrator

Foundation v6 extends the governed control plane with a production-style orchestration layer.

## Added controls
- durable NDJSON operation journal with per-record SHA-256
- execution queue with bounded capacity and cancellation
- idempotency/replay protection
- capability registry and fail-closed capability checks
- host heartbeat monitoring
- scoped approval tokens with TTL and revocation
- crash-recovery scanner for interrupted operations
- tamper-evident operation event ledger

## State model
`QUEUED -> RUNNING -> READBACK -> VERIFYING -> DONE`

Failure paths are explicit: `UNKNOWN`, `RECOVERY_REQUIRED`, `CANCELLED`.

## Certification
Run on Windows PowerShell:

```powershell
Set-Location <AE_BOSS_ROOT>
.\certification\run-foundation-v6.ps1
```

Local Node certification does not claim live After Effects success. Live certification must collect real host evidence.
