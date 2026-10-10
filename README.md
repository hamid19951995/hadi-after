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
