# Foundation v31 — Character + Prop Intelligence

v31 extends the v30 Character Interaction Engine with a deterministic prop intelligence layer. Props have typed specifications, affordances, interaction anchors, initial state, and a strict transition model.

## Included

- Prop normalization and validation
- Typed prop catalog with interaction affordances
- Character → Prop action planning: `pickUp`, `attach`, `carry`, `use`, `place`, `handoff`, `detach`, `drop`
- Deterministic state transitions, holder ownership, handoff transfer, and final-state readback
- Timeline conflict detection for shared props and source characters
- Deterministic operation keys and plan fingerprinting
- Optional intent inference for English/Persian action phrases
- ExtendScript host adapter for creating/positioning prop layers
- JSON contract: `contracts/character-prop-intelligence-plan.v1.schema.json`

## Architecture boundary

v29 remains the Professional Action Library, v30 remains Character Interaction Engine, and v31 composes prop intelligence above them. Prop behavior does not mutate the v30 interaction contract.

## Verification boundary

Node regression and static validation can run in this environment. Live execution inside a locally installed Adobe After Effects host is not claimable here.
