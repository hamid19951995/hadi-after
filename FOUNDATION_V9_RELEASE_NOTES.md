# AE BOSS Ω Foundation v9 — Governed Real-AE Runtime

Foundation v9 closes the architecture gap between the durable execution core and a real After Effects host.

## New subsystems
- Host Governor: session, heartbeat, exclusive lease and offline/unknown states.
- AE Bridge v9: newline-delimited JSON protocol over localhost TCP with request IDs and timeouts.
- Readback Engine v9: captures post-execution state and evidence hashes.
- Transaction Engine v9: pre-state capture, governed apply, post-state readback and rollback/recovery classification.
- Watchdog v9: stale-host detection.

## Safety
No operation is considered verified from an ACK alone. The runtime requires a post-execution readback result. Lease ownership prevents concurrent host mutation. A stale host becomes UNKNOWN and must be reconciled before retry.

## Certification boundary
Node-level tests prove protocol/orchestration behavior. Live After Effects certification still requires running the included JSX smoke/harness on a Windows machine with After Effects installed.
