class RecoveryManager {
  constructor(store) { this.store = store || new Map(); }
  checkpoint(operationId, snapshot) {
    const cp = {operationId, createdAt:new Date().toISOString(), snapshot};
    this.store.set(operationId, cp);
    return cp;
  }
  get(operationId) { return this.store.get(operationId) || null; }
  canRollback(operationId) { return !!this.store.get(operationId); }
}
module.exports = { RecoveryManager };
