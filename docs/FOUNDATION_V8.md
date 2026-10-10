# Foundation v8 Architecture

`ExecutionOrchestratorV8` is the governed boundary between intent and host mutation.

Flow:

`ENQUEUE → ADMIT → PLAN → PLAN_HASH → APPROVAL_REQUIRED → HUMAN_APPROVE → QUEUE → EXECUTION_START → HOST → VERIFY → DONE`

Failures never become implicit success. Timeout or ambiguous host state becomes `UNKNOWN` and requires reconciliation before retry.

## Restart model

The journal is authoritative for operation history. Idempotency is durable. Approval records are durable and HMAC scoped. A new process can hydrate an operation from the journal and reconcile before retry.

## Security model

1. Capability must exist and be enabled.
2. Admission policy must allow risk/action/sandbox/parameter size.
3. Mutating actions require expected state.
4. Approval is scoped to operation, plan spec and target.
5. Plan hash is checked immediately before execution.
6. Host result must explicitly report `VERIFIED` for success.
