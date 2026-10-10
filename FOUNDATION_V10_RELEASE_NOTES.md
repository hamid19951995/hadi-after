# AE BOSS Ω Foundation v10 — Autonomous Production Runtime

Foundation v10 extends v9 from a governed bridge/runtime into a production-oriented execution layer.

## Added
- Production Runtime state machine with explicit approval binding.
- Durable project snapshots with SHA-256 integrity and restore.
- Render Queue abstraction with enqueue/status/cancel.
- Asset Dependency Graph with broken-edge validation.
- Concurrency-limited Job Scheduler with idempotent job IDs.
- Deny-by-default Capability Guard.
- Append-only SHA-256 Audit Ledger with chain verification.
- Recovery Coordinator using verified snapshots.
- Windows PowerShell certification runner.

## Safety model
- Approval is bound to the exact operation specification hash.
- Host must report READY before mutation.
- Verification is separate from execution ACK.
- Failed postconditions move the operation to UNKNOWN and trigger controlled recovery.
- Capability access is deny-by-default.

## Live AE certification
Node-level certification is included. Live After Effects certification still requires executing the JSX smoke/harness inside the target Windows/After Effects installation.
