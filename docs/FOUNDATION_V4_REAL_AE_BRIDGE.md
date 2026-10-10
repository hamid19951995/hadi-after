# AE BOSS Ω Foundation v4 — Real AE Bridge & Transaction Layer

## Purpose
Foundation v4 is the transition from a governed runtime prototype to a real-host integration boundary.

### Core invariant
`ENVELOPE → HOST VALIDATION → APPLY → INDEPENDENT READBACK → DIFF → VERIFY → EVIDENCE`

### New modules
- `contracts/ae-bridge-envelope.v1.schema.json`
- `runtime/ae/bridge/bridge-protocol-v1.js`
- `runtime/ae/bridge/governed-ae-adapter.js`
- `runtime/ae/bridge/host-governor.jsx`
- `runtime/ae/recovery/transaction-v1.js`
- `test/ae-runtime/golden-project-v1.json`

### Security properties
1. Every APPLY has an operation identity.
2. APPLY requires a lease.
3. Lease is bound to action + target by scope hash.
4. Nonce replay is rejected.
5. Stale messages are rejected.
6. Host command allowlist rejects unknown commands.
7. Free-form script execution is not accepted by this host governor.
8. Readback is a separate phase.
9. Verification mismatch is never promoted to DONE.
10. Rollback is based on a pre-mutation snapshot.

## Real After Effects gate
A real host certification must execute against After Effects on Windows and collect:
- host version/capability evidence
- project identity
- pre-state snapshot
- command envelope
- host result
- post-state readback
- expected/actual diff
- verification certificate
- saved project path/hash
- render evidence when applicable.

If the host cannot provide independent evidence, status remains `UNKNOWN`.

## Windows command
`powershell -ExecutionPolicy Bypass -File .\certification\run-foundation-v4.ps1`

Real host:
`powershell -ExecutionPolicy Bypass -File .\certification\run-foundation-v4.ps1 -RealAE -ProjectPath "C:\path\golden.aep"`
