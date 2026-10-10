# Foundation v32

## Architecture

v32 is the offline production orchestrator. It receives normalized data from v28-v31 and produces one deterministic production plan.

`Character -> Action/Interaction -> Prop Intelligence -> Production Graph -> Cache/Checkpoint -> AE Host`

## Offline guarantee

The v32 runtime makes no network calls and has no third-party Python package requirements. Network access is not required for plan compilation, validation, graph generation, conflict detection, caching, or checkpointing.

## Resume model

A job can save a checkpoint under `checkpoint.v1`. A later invocation can restore the latest local state and continue deterministically.

## Cache model

Cache keys are SHA-256 hashes over a namespace and canonicalized JSON payload. This prevents accidental reuse when the plan changes.
