# FOUNDATION v58 — Live Compatibility Gate & Evidence Qualification

v58 adds a deterministic compatibility gate between live evidence and the release/certification pipeline. Local tests do not imply host certification. Evidence is validated for required fields, PASS operation status, and readback presence, then compared against an explicit host/environment profile. The result is `CERTIFIABLE` or `BLOCKED`.

This module is intentionally conservative: unknown or mismatched host requirements block certification rather than being silently accepted.
