# Foundation v7 Upgrade Guide

## What changed from v6

### 1. Approval is now real
v6 could create an approval token inside the execution path. v7 requires an explicit:

```js
await orchestrator.plan(operationId);
orchestrator.approve(operationId, "human-operator");
await orchestrator.next();
```

This prevents a model/provider from becoming its own approver.

### 2. Persistent idempotency
Use `PersistentIdempotencyStoreV3` for restart-safe duplicate suppression.

### 3. Journal integrity
Use `PersistentOperationJournalV2`. Every record references the previous record hash.

### 4. Risk admission
`AdmissionPolicyV7` defaults to HIGH and rejects CRITICAL/sandbox commands. Raise the ceiling only with an intentional security review.

## Real AE boundary

The Node tests are not evidence that After Effects executed correctly. Live host certification must run through the AE bridge and must capture:

- host heartbeat
- command capability response
- pre-mutation snapshot
- host apply result
- independent readback
- expected-state comparison
- rollback evidence when required
- final audit/journal hash

Never treat provider output, UI status text, or a model claim as execution evidence.
