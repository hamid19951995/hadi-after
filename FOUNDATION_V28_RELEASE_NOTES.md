# Foundation v28 — Advanced Rig Engine

v28 is an additive upgrade over Foundation v27. The original-character generator and v27 planning contracts remain available unchanged.

## Added
- Advanced Rig Engine v1 planning layer.
- Deterministic controller bindings for root/body/head, arms, hands, legs and feet.
- Constraint profiles and solver configuration.
- Deterministic procedural keyframe generation with eased transitions.
- Operation-key based idempotency for generated keyframes.
- After Effects ExtendScript host adapter for applying controller controls and keyframes.
- v28 automated regression tests.

## Compatibility
- `foundation-v27` remains the base implementation.
- Existing v27 APIs are re-exported by `foundation-v28`.
- v28 requires Node.js with CommonJS support for the planner tests.
- Actual After Effects execution must be validated inside the target AE installation; the supplied Node test suite does not emulate the AE host.
