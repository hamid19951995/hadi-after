# Foundation v21 Release Notes

## Recoverable Transactional Runtime
- Journal-derived recovery state with completed and pending steps.
- Resume after interrupted execution without replaying committed steps.
- Durable STEP_INTENT / STEP_COMMIT semantics.
- Fencing-token checks before and after execution commits.
- Lease renewal per step.
- Idempotent reuse of a committed job.
- Output verification before JOB_COMMIT.
- Tamper detection before every execution.
