# AEPIPE contracts

`action-envelope.schema.json` is the canonical request envelope. The panel enforces the state machine in `js/aepipe.js`; host mutations are only attempted after a user approval and a bounded lease. Every mutation triggers summary and health readback. Missing readback remains `UNKNOWN`.
