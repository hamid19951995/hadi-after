const crypto = require("crypto");

const STATES = Object.freeze([
  "INTENT","SCOPE","AUTHORITY","TRUST","CAPABILITY","STATE","POLICY",
  "SPEC","PLAN","PREFLIGHT","SIMULATION","DRY_RUN","APPROVAL",
  "LEASED","APPLY","READBACK","VERIFY","EVIDENCE","QC","DONE",
  "FAILED","UNKNOWN","CANCELLED","ROLLBACK","RECOVER","AUDIT"
]);

const TERMINAL = new Set(["DONE","FAILED","UNKNOWN","CANCELLED"]);
const TRANSITIONS = new Map([
  ["DRY_RUN", new Set(["APPROVAL","FAILED","CANCELLED","UNKNOWN"])],
  ["APPROVAL", new Set(["LEASED","FAILED","CANCELLED"])],
  ["LEASED", new Set(["APPLY","FAILED","CANCELLED","UNKNOWN"])],
  ["APPLY", new Set(["READBACK","FAILED","UNKNOWN","CANCELLED"])],
  ["READBACK", new Set(["VERIFY","FAILED","UNKNOWN"])],
  ["VERIFY", new Set(["EVIDENCE","FAILED","UNKNOWN"])],
  ["EVIDENCE", new Set(["QC","FAILED","UNKNOWN"])],
  ["QC", new Set(["DONE","FAILED","UNKNOWN","ROLLBACK"])],
  ["ROLLBACK", new Set(["READBACK","RECOVER","FAILED","UNKNOWN"])],
  ["RECOVER", new Set(["READBACK","FAILED","UNKNOWN"])],
]);

function sha256(value) {
  return crypto.createHash("sha256").update(
    typeof value === "string" ? value : JSON.stringify(value)
  ).digest("hex");
}

function stableJson(value) {
  return JSON.stringify(value, Object.keys(value || {}).sort());
}

function now() { return new Date().toISOString(); }

class AERuntimeV3 {
  constructor({ executor, registry }) {
    if (typeof executor !== "function") throw new TypeError("executor is required");
    this.executor = executor;
    this.registry = registry || {};
    this.operations = new Map();
    this.idempotency = new Map();
  }

  createOperation(input) {
    if (!input || !input.operationId || !input.action) throw new Error("INVALID_OPERATION");
    if (this.idempotency.has(input.idempotencyKey)) {
      return { replay: true, operation: this.operations.get(this.idempotency.get(input.idempotencyKey)) };
    }
    const op = {
      operationId: input.operationId,
      action: input.action,
      target: input.target || {},
      parameters: input.parameters || {},
      authorization: input.authorization || {},
      execution: { mode: input.mode || "DRY_RUN" },
      state: "DRY_RUN",
      createdAt: now(),
      events: []
    };
    this.operations.set(op.operationId, op);
    if (input.idempotencyKey) this.idempotency.set(input.idempotencyKey, op.operationId);
    this.record(op, "CREATED");
    return { replay: false, operation: op };
  }

  transition(op, next) {
    const allowed = TRANSITIONS.get(op.state);
    if (!allowed || !allowed.has(next)) {
      throw new Error(`ILLEGAL_TRANSITION:${op.state}->${next}`);
    }
    op.state = next;
    this.record(op, "STATE_CHANGED");
  }

  record(op, type, data={}) {
    const previous = op.events[op.events.length - 1];
    const event = {
      seq: op.events.length + 1,
      type,
      at: now(),
      state: op.state,
      data,
      prevHash: previous ? previous.hash : "0".repeat(64)
    };
    event.hash = sha256(event);
    op.events.push(event);
  }

  validateLease(op) {
    const l = op.authorization || {};
    if (!l.leaseId || !l.scopeHash) throw new Error("LEASE_REQUIRED");
    if (l.expiresAt && Date.parse(l.expiresAt) <= Date.now()) throw new Error("LEASE_EXPIRED");
    if (l.revokedAt) throw new Error("LEASE_REVOKED");
    const expected = sha256({action:op.action,target:op.target});
    if (l.scopeHash !== expected) throw new Error("LEASE_SCOPE_MISMATCH");
  }

  async execute(op) {
    if (op.execution.mode !== "APPLY") return { state: op.state, dryRun: true };
    this.validateLease(op);
    if (op.state !== "DRY_RUN") throw new Error("INVALID_START_STATE");

    this.transition(op, "APPROVAL");
    if (op.authorization.approved !== true) throw new Error("APPROVAL_REQUIRED");
    this.transition(op, "LEASED");
    this.transition(op, "APPLY");

    let applyResult;
    try {
      applyResult = await this.executor({ phase:"APPLY", operation:op });
      this.record(op, "APPLY_RESULT", { ok:true });

      this.transition(op, "READBACK");
      const readback = await this.executor({ phase:"READBACK", operation:op });
      op.readback = readback;
      this.record(op, "READBACK", { hash:sha256(readback) });

      this.transition(op, "VERIFY");
      const verified = !!(readback && readback.verified === true);
      if (!verified) {
        this.transition(op, "UNKNOWN");
        this.record(op, "VERIFICATION_INCONCLUSIVE");
        return { state:"UNKNOWN", operation:op };
      }

      this.transition(op, "EVIDENCE");
      const evidence = {
        operationId:op.operationId,
        action:op.action,
        readbackHash:sha256(readback),
        verifiedAt:now()
      };
      evidence.hash = sha256(evidence);
      op.evidence = evidence;
      this.record(op, "EVIDENCE", { hash:evidence.hash });

      this.transition(op, "QC");
      this.transition(op, "DONE");
      this.record(op, "COMPLETED");
      return { state:"DONE", result:applyResult, operation:op };
    } catch (err) {
      this.record(op, "EXECUTION_ERROR", { code:String(err.message || err) });
      if (!TERMINAL.has(op.state)) {
        op.state = "UNKNOWN";
        this.record(op, "UNKNOWN");
      }
      return { state:op.state, error:String(err.message || err), operation:op };
    }
  }

  verifyAudit(op) {
    let prev = "0".repeat(64);
    for (const e of op.events) {
      const expected = sha256({...e, hash:undefined});
      if (e.prevHash !== prev || e.hash !== expected) return false;
      prev = e.hash;
    }
    return true;
  }
}

module.exports = { AERuntimeV3, STATES, sha256 };
