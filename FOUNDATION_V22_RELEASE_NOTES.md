# Foundation v22 — Reconciled Exactly-Once Transactional Runtime

## Highlights
- Adds `STEP_PREPARE` and deterministic `operationKey` records.
- Detects uncertain steps (prepared without committed) after interruption.
- Supports runtime-side `reconcileStep()` probes before retrying uncertain operations.
- Commits reconciled effects without replaying an already-applied external operation.
- Rejects resume when the persisted job specification hash differs.
- Preserves hash-chained journal integrity, fencing leases, idempotent completed-job reuse, and output verification.

## Recovery model
A crash can leave an external AE effect applied while the runtime has not yet written `STEP_COMMIT`. v22 marks that step uncertain and probes the host on resume. If the host confirms the deterministic operation key was already applied, v22 commits the journal without executing the step again.
