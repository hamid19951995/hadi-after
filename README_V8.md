# AE BOSS Ω Foundation v8

Foundation v8 is the next governed execution layer after v7. It is designed for long-running, restartable AE automation rather than one-shot scripts.

## Guarantees

- A mutation is not executed without an explicit approval token when approval is enabled.
- Approval is durable and cryptographically scoped to operation/spec/target.
- The plan is hashed after planning and checked again immediately before execution.
- Idempotency keys are durable and cannot silently be reused for a different request.
- Journal records are persisted as a SHA-256 hash chain with an fsync on append.
- Host ambiguity and timeouts never become success; they become `UNKNOWN` and require reconciliation.
- Mutating capabilities require an expected state.
- Admission policy can enforce action allowlists, denylists, risk ceilings, sandbox policy and parameter-size limits.

## Windows certification

From PowerShell:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\certification\run-foundation-v8.ps1
```

Node certification is automated. Live After Effects certification remains a separate host-level gate and is not claimed by the Node suite.

## Migration

To preserve v7 journal history while creating a new v8 hash chain:

```powershell
node .\tools\migrate-v7-to-v8.js .\.aeboss\operation-journal-v2.ndjson .\.aeboss\operation-journal-v3.ndjson
```

Migration records preserve the original record hash and event in the new journal; the original v7 journal is never overwritten.
