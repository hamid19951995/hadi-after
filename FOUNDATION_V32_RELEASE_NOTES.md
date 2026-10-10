# Foundation v32 — Offline Production Intelligence & Runtime Orchestrator

v32 is the first orchestration layer after v31. It does not replace v28 Rig Engine, v29 Professional Action Library, v30 Character Interaction Engine, or v31 Character + Prop Intelligence. Instead it composes them into a deterministic, resumable, offline production plan.

## Core capabilities

- Unified production plan for characters, props, actions, interactions, and prop-actions
- Dependency graph generation
- Cross-resource conflict detection
- Deterministic plan fingerprinting
- Deterministic disk cache keys and cache store
- Checkpoint creation and restoration
- Offline-only execution policy
- Local Python v32 runtime for health, plan compilation, fingerprinting, and policy checks
- CEP bridge through `js/production-engine.js`
- JSON contract `contracts/offline-production-plan.v1.schema.json`

## Verification boundary

Node regression and local Python tests are executable in this environment. Live Adobe After Effects execution still requires a locally installed AE host and is not claimed here.
