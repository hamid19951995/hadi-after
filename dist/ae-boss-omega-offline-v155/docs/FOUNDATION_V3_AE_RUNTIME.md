# AE BOSS Ω Foundation v3 — AE Runtime

## Objective
Upgrade Foundation v2.1 from governed core semantics to a deterministic AE Runtime contract.

## Runtime invariant
No mutation is considered complete until:

DRY_RUN → APPROVAL → LEASED → APPLY → READBACK → VERIFY → EVIDENCE → QC → DONE

If READBACK or verification is inconclusive, the result is UNKNOWN.

## New components
- `runtime/ae/ae-runtime-v3.js`
- `runtime/ae/readback/ae-readback.jsx`
- `runtime/ae/twin/digital-twin-v2.js`
- `runtime/ae/recovery/recovery-manager.js`
- `runtime/ae/commands/command-registry.json`
- `contracts/ae-runtime.v1.schema.json`

## Security boundaries
- Readback adapter is read-only.
- Free-form `eval` is not introduced.
- Script execution remains a separately classified critical capability.
- Lease scope is cryptographically bound to action + target.
- Audit entries are hash chained.
- Verification failure cannot produce DONE.

## Windows certification
Run:
`powershell -ExecutionPolicy Bypass -File .\certification\run-foundation-v3.ps1`

This test validates the runtime contract in Node. Real After Effects certification remains a separate host-level gate.
