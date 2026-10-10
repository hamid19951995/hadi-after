# Foundation v30 Release Notes

## Character Interaction Engine

Added a complete interaction-planning layer above the Advanced Rig Engine. The module validates characters, normalizes interaction envelopes, detects same-source timeline conflicts, generates deterministic operation keys, and produces a fingerprinted interaction plan.

## Compatibility

The existing v28 foundation remains available and v30 composes it without changing the v28 API contract.

## Verification

- v30 focused regression: PASS
- full inherited Node regression suite: run through `npm test`
- Adobe After Effects live-host execution: not claimable in this environment
