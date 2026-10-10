# FOUNDATION v36 — Local Terminal & Permissioned Windows Automation

v36 adds a local, permission-governed terminal boundary intended for user-approved automation on the host Windows machine.

## Core
- Internal terminal abstraction for PowerShell and CMD.
- Explicit permission scopes and levels.
- Grant/revoke/check audit trail.
- Default deny.
- Dry-run by default for safe validation.
- Local command safety blocklist for destructive commands unless the implementation is deliberately extended with a separate high-risk approval flow.
- Automation orchestrator for multi-step terminal tasks.

## Permission model
Scopes include `terminal.windows`, `filesystem.workspace`, and `aftereffects.runtime`. No scope is enabled automatically.

## Security boundary
This feature is designed for the local host only and does not bypass Windows, Adobe, UAC, or account permissions. A user grant inside the panel is not equivalent to elevated OS administrator privileges.
