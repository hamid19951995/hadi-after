# Foundation v11 Architecture

`PLAN → ASSET ADMISSION → CAPABILITY AUTHORIZATION → APPROVAL → SNAPSHOT → EXECUTE → VERIFY → DONE`

Any unresolved execution is recorded in the audit ledger and enters recovery. A transport-level success is never treated as proof of an After Effects state change.

## Operational guarantees

- A reused `operationId` must carry the identical specification hash.
- Host-required capabilities are denied unless the governor reports `READY`.
- Invalid asset graphs are rejected before mutation.
- Snapshot recovery is attempted after unresolved post-snapshot execution.
- Every major transition is written to the tamper-evident audit chain.
