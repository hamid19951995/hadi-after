# AE BOSS OMEGA Offline Core Contracts

## Runtime flow

`UI -> app.js -> OfflineCore -> ExecutionCore -> AEPipe/hostCall -> JSX -> AE DOM -> summary/health readback`

The UI may propose a request. It does not own AE mutation policy. Mutation commands remain routed through `hostCall`, AEPipe approval, JSX dispatch, and post-condition verification.

## OfflineCore

- `runtime/offline-core.js` is deterministic and stdlib/browser safe.
- `resolveIntent(text, context)` returns an intent, parameters, capability, confidence, and either `RESOLVED` or `CLARIFICATION_REQUIRED`.
- `compilePlan(resolution, context)` returns a versioned plan and deterministic fingerprint.
- `validateGraph(plan)` rejects duplicate actions, missing dependencies, and circular dependencies.
- `ContextRuntime` provides serializable session state.
- `checkpoint()` and `canResume()` bind recovery to the plan fingerprint.
- `auditNetworkText()` reports references that must be blocked by Offline Strict.

## ExecutionCore

- `runtime/execution-core.js` defines capability modes: `DENY`, `ASK`, `SESSION`, `PERSISTENT`.
- Every action contract declares capability, timeout, retry policy, checkpoint policy, and required verification.
- Job transitions are explicit; invalid transitions return `INVALID_ACTION_TRANSITION`.
- Checkpoints contain job ID, plan fingerprint, current step, completed steps, context, verification results, timestamp, and integrity fingerprint.
- Evidence contains before state, action, after state, verification, timestamp, and fingerprint.

## Offline Strict

`js/offline-policy.js` blocks external `fetch`, XHR, WebSocket, `sendBeacon`, and dynamically-added remote scripts/links. Block events are retained in `aeBossOfflineNetworkAudit` with URL, source, operation, timestamp, and policy reason. Localhost and file URLs remain available for the local bridge.

## Current boundary

The current release has deterministic offline intent/planning and execution contracts plus tests. Full live AE certification, render monitoring, disk cache persistence, and end-to-end automatic transaction rollback still require execution inside After Effects and are not reported as certified by local tests.
