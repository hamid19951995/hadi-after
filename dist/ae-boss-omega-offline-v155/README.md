# AE BOSS OMEGA Foundation v38

## Autonomous Workspace & Secure Agent Runtime

v38 upgrades the complete Foundation lineage through v38 while preserving previous layers.

### New architecture
- Permissioned Windows Automation (v36)
- Permission Center and Controlled Console (v37)
- Named isolated workspaces
- Workspace path-escape prevention
- Dependency-aware priority task queue
- Secure local agent with visible execution plan
- Preview-first command execution
- Sensitive-action confirmation gate
- Emergency-stop compatibility
- Verified completion semantics

### Security boundary
The project uses default-deny permissions and does not bypass Windows UAC, operating-system permissions, Adobe security boundaries, or external security controls. Live Adobe After Effects execution is not claimed as tested by this package unless separately executed in an actual AE environment.

## v39 — Real Adobe After Effects Execution Bridge
v39 adds the governed execution path: Production Plan → Preview → Apply → AE DOM Readback → Verified/Mismatch. Live execution requires a real installed Adobe After Effects host and an approved local bridge; no Windows, UAC, Adobe, or network security controls are bypassed.

## v56 Production Control Plane Hardening
The current package adds deterministic snapshots, capability-based admission, plan linting, idempotency, hardened local policy checks, release gating, observability, and a unified production control plane. Live AE certification remains deliberately separated from local test success.

## v155 Live After Effects Agent

The CEP production workflow is driven by real After Effects events: request intake, live project/health inspection, plan and user approval, host execution, per-step semantic readback, repair/continuation, final verification, and terminal reporting. Progress is event-based; elapsed-time animations or assistant text cannot mark a task complete. Every successful mutating workflow saves the project after verification and checks the saved file and project state again. Rendering remains opt-in and runs only when explicitly requested. The health gate records a pre-mutation baseline, so existing missing-footage or expression issues are reported without blocking unrelated edits; new health issues block a mutation from being marked successful. Agent sessions are retained across commands and turns, receive the latest readback before finishing, and cannot accept `done:true` while required visible output is missing. If a host mutation has an unknown outcome, automatic retry is blocked to avoid duplicating project changes. Stop requests halt the workflow after the current host operation returns.

Live execution requires the installed CEP panel and a running After Effects host. Browser preview and Node-based tests validate the bridge contract and workflow logic, but do not certify execution in a live Adobe After Effects installation.


## Evidence-driven request lifecycle

Requests are validated as complete batches before execution. Each accepted request has a run ID, ordered timestamped events, and a persisted final receipt (`aeBossWorkflowRun`, also exposed by `AEBossAgentUI.getRun()`). Progress reflects observed phases only; skipped work is not marked executed. Interrupted runs are reported on panel reload and are never replayed automatically.

Repairs require approval, consume the agent budget, resolve a specific failed step only after host verification, and resume the original remaining steps. Unknown outcomes and cancellation are never automatically retried. Final delivery checks the live project against its pre-save contents and the saved-path witness, including projects without an active composition. The receipt distinguishes saved projects from render-queue state: queued work is not rendered output. Render completion requires exact DONE status and matching nonempty files for the queued targets. Image-sequence templates currently fail closed because sequence-aware file verification is not implemented.

Run `npm test` for local behavioral and regression checks. These tests use controlled host fixtures, not a live Adobe process. Installation and real request → approval → execution → save/render validation must still be performed in the CEP panel inside After Effects.
