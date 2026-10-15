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

## v155 governed CEP execution hardening

- CEP host commands are routed through `AEBossHostCall`; dashboard modules must not call `CSInterface.evalScript` directly.
- Host calls have a bounded timeout, request ID and response-contract check. A timeout, malformed response, or failed post-mutation readback is recorded as `UNKNOWN`; callers must inspect AE state before retrying.
- AEPipe enforces `LEASED -> APPLYING -> VERIFYING -> SUCCESS/UNKNOWN`. Mutations require a live user-approved lease; read-only commands finish separately from mutation verification.
- A mutation can reach `SUCCESS` only when AE returns a semantic readback witness, the follow-up summary describes the same project, and health reports `ok: true`. Implemented witnesses cover core composition/text/layer/keyframe/effect/import/render-queue operations. Unimplemented mutation verifiers fail closed.
- Browser preview without CEP reports `HOST_UNAVAILABLE`; it does not simulate an AE mutation as successful.
- Local unit tests exercise verifier decisions using synthetic state. They do not certify behavior inside a live After Effects process.
- The CEP installer copies the complete `runtime/` and `offline-runtime/` directories. Agent mode is loaded by `html/index.html`, returns bounded command batches, and receives a fresh verified AE observation after each batch.
- `done:true` is reserved for verified completion. A model requesting more user information must return `clarificationRequired:true`; that response stops without a completion claim.
- JSX returned by a model must include a bounded `expectedState` declaration. Bare JSX is rejected before execution because script completion alone is not evidence that the requested project state exists.

## Live AI agent loop

- AI-provider tasks run as bounded sessions: at most 4 commands per turn, 6 turns, and 32 accepted commands total.
- Each completed batch is followed by fresh AE summary and health readback. The provider receives a compact project inventory plus per-command AEPipe verification evidence before it plans the next batch.
- The provider must explicitly return `done: true` to finish. Missing commands without that signal stop as incomplete; a successful command response alone is not completion.
- Completion requires a healthy AE observation and at least one successful AEPipe-verified host operation. Provider heuristics running in Offline Core are not treated as an autonomous AI agent.
- Mutations continue to require user approval. No background loop can bypass the existing host permissions or command validation.


## Evidence-driven request lifecycle

Requests are validated as complete batches before execution. Each accepted request has a run ID, ordered timestamped events, and a persisted final receipt (`aeBossWorkflowRun`, also exposed by `AEBossAgentUI.getRun()`). Progress reflects observed phases only; skipped work is not marked executed. Interrupted runs are reported on panel reload and are never replayed automatically.

Repairs require approval, consume the agent budget, resolve a specific failed step only after host verification, and resume the original remaining steps. Unknown outcomes and cancellation are never automatically retried. Final delivery checks the live project against its pre-save contents and the saved-path witness, including projects without an active composition. The receipt distinguishes saved projects from render-queue state: queued work is not rendered output. Render completion requires exact DONE status and matching nonempty files for the queued targets. Image-sequence templates currently fail closed because sequence-aware file verification is not implemented.

Run `npm test` for local behavioral and regression checks. These tests use controlled host fixtures, not a live Adobe process. Installation and real request → approval → execution → save/render validation must still be performed in the CEP panel inside After Effects.
