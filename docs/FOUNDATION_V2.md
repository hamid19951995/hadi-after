# AE BOSS Ω — Foundation v2

This upgrade preserves the existing CEP/AE Studio surface and adds a governed kernel layer.

## Canonical execution
`PROPOSED → SCOPE_VALIDATED → PREFLIGHT → SIMULATED → DRY_RUN → APPROVAL → LEASED → APPLYING → READBACK → VERIFYING → SUCCESS/FAILED/UNKNOWN`

## Safety invariants
- Models may propose; they cannot execute.
- APPLY requires approval and a valid, unexpired lease.
- Verification failure never becomes SUCCESS; it remains UNKNOWN unless a definitive failure is known.
- Evidence and audit are distinct.
- Digital Twin is a model, never proof of real AE state.
- `runScript` remains a sensitive action and must be sandboxed/validated by the runtime before production enablement.

## Added modules
- `kernel/aepipe/aepipe-core.js`
- `kernel/policy/policy-engine.js`
- `twin/digital-twin.js`
- `evidence/evidence-store.js`
- `audit/audit-chain.js`
- `recovery/recovery-manager.js`
- `contracts/action-envelope.v2.schema.json`
- `test/foundation/aepipe-foundation-v2.test.js`

## Current certification boundary
Foundation v2 is **code-level governed foundation**, not yet a claim of full production certification. Real After Effects integration, crash recovery, visual QC, Windows runtime hardening, and full golden-project certification remain subsequent gates.
