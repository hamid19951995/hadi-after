const crypto = require("crypto");

function hash(x) {
  return crypto.createHash("sha256").update(JSON.stringify(x)).digest("hex");
}

class AETransactionV1 {
  constructor({snapshotReader, actionExecutor, rollbackExecutor}) {
    if (typeof snapshotReader !== "function") throw new Error("snapshotReader required");
    if (typeof actionExecutor !== "function") throw new Error("actionExecutor required");
    if (typeof rollbackExecutor !== "function") throw new Error("rollbackExecutor required");
    this.snapshotReader = snapshotReader;
    this.actionExecutor = actionExecutor;
    this.rollbackExecutor = rollbackExecutor;
  }

  async begin(operation) {
    const before = await this.snapshotReader();
    return {
      transactionId: "tx-" + crypto.randomUUID(),
      operationId: operation.operationId,
      startedAt: new Date().toISOString(),
      before,
      beforeHash: hash(before),
      reversible: true,
      status: "OPEN"
    };
  }

  async apply(tx, operation) {
    try {
      tx.result = await this.actionExecutor(operation);
      tx.status = "APPLIED";
      return tx;
    } catch (error) {
      tx.error = String(error.message || error);
      tx.status = "APPLY_FAILED";
      return tx;
    }
  }

  async verify(tx, expectedState) {
    const after = await this.snapshotReader();
    tx.after = after;
    tx.afterHash = hash(after);
    tx.expectedHash = hash(expectedState);
    tx.verified = tx.afterHash === tx.expectedHash;
    tx.status = tx.verified ? "VERIFIED" : "MISMATCH";
    return tx;
  }

  async rollback(tx) {
    if (!tx || !tx.before) throw new Error("NO_ROLLBACK_SNAPSHOT");
    const result = await this.rollbackExecutor(tx.before);
    tx.rollbackResult = result;
    tx.status = "ROLLED_BACK";
    return tx;
  }
}
module.exports = {AETransactionV1, hash};
