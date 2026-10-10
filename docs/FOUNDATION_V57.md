# v57 — Live Certification & Evidence Pipeline
v57 closes a remaining release gap: local/unit tests are separated from evidence-backed Live Adobe After Effects certification.

A Live Evidence document records environment, bridge version, per-operation status, and readback. Certification is deterministic and SHA-256-addressed. A PASS certificate requires every listed operation to PASS with readback evidence.

This does not fake Live AE execution; the evidence file must be produced from a real host run.
