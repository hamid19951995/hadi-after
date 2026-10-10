const crypto = require("crypto");

const PHASES = new Set([
  "HELLO","CAPABILITY","PREFLIGHT","DRY_RUN","APPLY","READBACK","CANCEL","HEARTBEAT"
]);

function sha256(x) {
  return crypto.createHash("sha256").update(
    typeof x === "string" ? x : JSON.stringify(x)
  ).digest("hex");
}

function nonce() {
  return crypto.randomBytes(24).toString("hex");
}

function messageId() {
  return crypto.randomUUID();
}

class BridgeProtocolV1 {
  constructor({clock=()=>Date.now(), maxSkewMs=15000}={}) {
    this.clock = clock;
    this.maxSkewMs = maxSkewMs;
    this.seen = new Map();
  }

  create({operationId, phase, action, target={}, parameters={}, authorization={}, specHash=null, payload={}}) {
    if (!PHASES.has(phase)) throw new Error("INVALID_PHASE");
    return {
      protocolVersion:"1.0",
      messageId:messageId(),
      operationId,
      nonce:nonce(),
      timestamp:new Date(this.clock()).toISOString(),
      phase, action, target, parameters, authorization, specHash, payload
    };
  }

  validate(envelope, {expectedLeaseId=null, expectedScopeHash=null}={}) {
    if (!envelope || envelope.protocolVersion !== "1.0") throw new Error("PROTOCOL_MISMATCH");
    if (!PHASES.has(envelope.phase)) throw new Error("INVALID_PHASE");
    if (!envelope.messageId || !envelope.operationId || !envelope.nonce) throw new Error("MISSING_IDENTITY");
    const t = Date.parse(envelope.timestamp);
    if (!Number.isFinite(t) || Math.abs(this.clock()-t) > this.maxSkewMs) throw new Error("MESSAGE_EXPIRED");
    if (this.seen.has(envelope.nonce)) throw new Error("REPLAY_DETECTED");
    if (envelope.phase === "APPLY") {
      if (!envelope.authorization || !envelope.authorization.leaseId) throw new Error("LEASE_REQUIRED");
      if (!envelope.authorization.scopeHash) throw new Error("SCOPE_HASH_REQUIRED");
      if (expectedLeaseId && envelope.authorization.leaseId !== expectedLeaseId) throw new Error("LEASE_MISMATCH");
      if (expectedScopeHash && envelope.authorization.scopeHash !== expectedScopeHash) throw new Error("SCOPE_MISMATCH");
    }
    this.seen.set(envelope.nonce, this.clock());
    return true;
  }

  fingerprint(envelope) {
    return sha256({
      protocolVersion:envelope.protocolVersion,
      operationId:envelope.operationId,
      phase:envelope.phase,
      action:envelope.action,
      target:envelope.target,
      parameters:envelope.parameters,
      specHash:envelope.specHash || null
    });
  }
}
module.exports = {BridgeProtocolV1, sha256};
