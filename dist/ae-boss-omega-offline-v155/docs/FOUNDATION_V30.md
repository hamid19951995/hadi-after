# FOUNDATION v30 — Character Interaction Engine

v30 sits on the completed v28 Advanced Rig Engine contract and adds a deterministic interaction planning layer.

## Supported interaction types
- lookAt
- faceTo
- approach
- distance
- gestureSync
- dialogueTurn
- pointTo
- follow
- handoff
- avoidance

## Guarantees
- source character IDs are validated against the character set
- interaction targets are explicit
- every interaction receives an operation key
- timeline bounds are validated against scene duration
- same-source overlapping interactions at equal priority are reported as conflicts
- deterministic fingerprint is generated for the complete plan

## Scope boundary
v30 does not implement prop intelligence. Prop-aware semantics belong to v31.

Live execution inside Adobe After Effects must still be validated in an installed AE host; Node regression tests validate the project contracts and deterministic planning logic.
