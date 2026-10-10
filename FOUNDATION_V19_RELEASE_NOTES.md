# Foundation v19 Release Notes

## Fenced and Journaled Autonomous Runtime

- Fencing-token leases prevent stale runtimes from committing after lease loss or reacquisition.
- Journaled atomic checkpoints add an append-only execution trace beside the current checkpoint.
- Lease token is propagated to runtime step execution.
- Completed-job reuse remains fingerprint-gated.
- Recovery, rollback, retries, cancellation, verification, and render orchestration remain compatible with v18.
