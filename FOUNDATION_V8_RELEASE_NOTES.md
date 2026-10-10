# AE BOSS Ω Foundation v8 — Governed Durable Execution

Foundation v8 hardens v7 into a restart-aware execution core.

## New controls
- Durable HMAC-backed approval store; approvals survive process restart and are scope-bound.
- Plan integrity hash prevents in-memory plan mutation between approval and execution.
- Durable idempotency v4 detects key reuse with a different request fingerprint.
- Journal v3 uses record IDs, fsync append, and a tamper-evident SHA-256 chain.
- Admission policy v8 supports allowlists, denylists, parameter-size limits, sandbox gating and risk ceilings.
- Execution timeout boundary and explicit UNKNOWN state prevent silent success assumptions.
- Journal hydration allows a fresh orchestrator process to recover operation metadata.
- Existing v1-v7 foundations remain intact.

## Certification status
Node-level automated certification: PASS when `npm test` completes successfully.
Live After Effects certification: not claimed until the Windows/After Effects host harness is executed.
