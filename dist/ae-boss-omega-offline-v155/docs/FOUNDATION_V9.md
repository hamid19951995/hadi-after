# Foundation v9 Architecture

`Intent → Policy → Plan → Approval → Host Session → Lease → Apply → Readback → Verify → Evidence → Done`

Failure path: `Apply → UNKNOWN/RECOVERY_REQUIRED → Reconcile → Retry or Rollback`.

The localhost bridge is deliberately narrow: JSON lines, request IDs, registered actions, timeout enforcement. It does not grant arbitrary shell execution.
