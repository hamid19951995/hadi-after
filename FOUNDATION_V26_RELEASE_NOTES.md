# AE BOSS OMEGA Foundation v26 — Character Project Intelligence

## Goal
Complete the next character-animation upgrade by adding a host-side, read-only AEP inspection path and using normalized project structure to improve original, independently generated character workflows.

## Added
- Read-only ExtendScript project inspector for compositions, layers, parents, controls and basic expression presence.
- Normalized `ae-project-inspection.v1` model with SHA-256 fingerprint.
- Character rig candidate detection using composition/layer/controller signals.
- Action-composition detection.
- Original action-library contracts built from semantic metadata only.
- Multi-character scene planning with deterministic operation keys.
- Character interaction planning.
- External reference sessions that explicitly prohibit asset copying/extraction.
- Integration with v25 character planning and earlier transactional/recovery runtime contracts.

## Production boundary
Actual inspection requires Adobe After Effects because `.aep` project semantics are proprietary host data. The v26 runtime does not pretend to fully parse the binary AEP format outside AE.
