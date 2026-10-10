# Foundation v18 — Lease-Safe Autonomous Production Runtime

## Added
- Distributed-style job lease registry to prevent concurrent execution of the same job.
- Lease acquisition and renewal around every plan step.
- Durable atomic checkpoints carrying fingerprint, completed steps, snapshot and lease owner.
- Stricter output verification: explicit verification failure fails the job and triggers recovery.
- Bounded exponential retry backoff extended to 4 seconds.
- v18 certification test covering execution, completed-job reuse and lease conflict.

## Production boundary
Actual `.aep` mutation and Adobe After Effects rendering still require a real, authorized AE host/bridge. v18 improves orchestration correctness around that host rather than pretending to emulate Adobe After Effects.
