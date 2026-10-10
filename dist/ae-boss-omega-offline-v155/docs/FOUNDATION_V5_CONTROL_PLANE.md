# AE BOSS Ω Foundation v5 — Governed Control Plane

Foundation v5 upgrades the v4 bridge into a transaction-oriented control plane.

## New invariants
`PLAN → SPEC_HASH → APPROVAL → LEASE → APPLY → READBACK → DIFF → VERIFY → DONE`
and on mismatch/failure:
`APPLY → READBACK → MISMATCH → ROLLBACK → READBACK → ROLLBACK_VERIFIED | RECOVERY_REQUIRED`

## Added controls
- bounded leases with operation + action + target scope binding
- command registry authorization before execution
- immutable hash-chained evidence ledger
- automatic rollback after verification mismatch
- rollback readback verification
- explicit `RECOVERY_REQUIRED` state when rollback cannot be proven
- canonical spec and approval hashes
- certification runner that executes the complete local regression suite

## What v5 does NOT claim
It does not claim that After Effects itself has been certified. Real-AE certification remains an external gate requiring Windows + the target After Effects installation + actual host evidence.

## Windows
`powershell -ExecutionPolicy Bypass -File .\certification\run-foundation-v5.ps1`

For real host validation:
`powershell -ExecutionPolicy Bypass -File .\certification\run-foundation-v5.ps1 -RealAE -ProjectPath "C:\path\golden.aep"`
