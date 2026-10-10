# AE BOSS Ω Foundation v4 — Real AE Bridge

Base: Foundation v3

This release adds the governed bridge protocol and transaction layer needed to connect AEPIPE to a real After Effects host without treating model claims as execution evidence.

Implemented:
- governed AE bridge envelope
- nonce/replay protection
- timestamp freshness
- lease and scope validation
- host-side allowlist
- governed AE adapter
- pre-mutation snapshot
- transaction state
- independent readback
- mismatch state
- rollback primitive
- golden project definition
- Windows certification runner

Certification:
- Node protocol/transaction tests: PASS
- Real After Effects host certification: NOT CLAIMED until run on Windows + After Effects
