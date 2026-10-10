# AE BOSS Ω Foundation v7 — Autonomous Execution Hardening

Foundation v7 upgrades v6 from an orchestration prototype into a safer governed execution core.

## Implemented

- **Explicit human approval gate:** mutating operations no longer receive an implicit approval token.
- **Admission policy:** capability, risk ceiling and sandbox requirements are enforced before queue admission and again before execution.
- **Persistent idempotency v3:** idempotency survives process restarts and is checksum-protected.
- **Tamper-evident journal v2:** operation records form a SHA-256 hash chain; deletion, insertion, reordering and modification are detectable.
- **Plan → approval → execute separation:** planning is distinct from authorization and execution.
- **Fail-closed recovery:** interrupted operations are reconciled and are never blindly duplicated.
- **Backward-compatible Foundation v1–v6 modules:** legacy components remain in place; v7 is additive.

## Security posture

Default policy:
- DRY/planning is allowed.
- Mutations require an explicit approval call.
- CRITICAL/sandboxed commands are rejected unless a dedicated sandbox policy is supplied.
- Real After Effects certification is **not claimed** by local Node tests.

## Certification

Run:

```powershell
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
Set-Location "<package>e-boss-omega"
npm test
```

A successful local run proves the Node-level contracts only. It does not prove behavior inside a live After Effects installation.

## Recommended production sequence

`PROPOSE → PREFLIGHT → PLAN → APPROVAL_REQUIRED → APPROVE → LEASE → APPLY → READBACK → VERIFY → DONE`

On mismatch:

`APPLY → READBACK → VERIFY → ROLLBACK → VERIFY_ROLLBACK`

On crash:

`RUNNING → RECOVERING → RECONCILE → REQUEUE` only when the host proves retry is safe; otherwise `RECOVERY_REQUIRED`.
