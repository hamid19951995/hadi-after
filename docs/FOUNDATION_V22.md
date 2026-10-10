# Foundation v22

v22 strengthens the recovery boundary between the transactional orchestrator and a real After Effects host. Each step receives a stable `operationKey` derived from job ID, full job specification hash, and step ID. Production bridges should persist this key alongside host-side effects and implement `reconcileStep(step, context)` to answer whether the effect was already applied.
