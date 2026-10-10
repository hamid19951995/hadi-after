/* AE BOSS Ω Host Governor v1
   Defensive boundary for CEP/ExtendScript.
   It validates the governed envelope before mutation dispatch. */
(function () {
  var MAX_SKEW_MS = 15000;
  var seen = {};

  function isObject(x) { return x && typeof x === "object"; }

  function nowMs() { return new Date().getTime(); }

  function parseTime(s) {
    var t = Date.parse(s);
    return isNaN(t) ? null : t;
  }

  function deny(code, detail) {
    return {ok:false, status:"DENIED", code:code, detail:detail || null};
  }

  function validateEnvelope(e, expectedLeaseId, expectedScopeHash) {
    if (!isObject(e)) return deny("INVALID_ENVELOPE");
    if (e.protocolVersion !== "1.0") return deny("PROTOCOL_MISMATCH");
    if (!e.messageId || !e.operationId || !e.nonce) return deny("MISSING_IDENTITY");
    if (!e.timestamp || parseTime(e.timestamp) === null) return deny("INVALID_TIMESTAMP");
    if (Math.abs(nowMs() - parseTime(e.timestamp)) > MAX_SKEW_MS) return deny("MESSAGE_EXPIRED");
    if (seen[e.nonce]) return deny("REPLAY_DETECTED");
    if (e.phase === "APPLY") {
      if (!e.authorization || !e.authorization.leaseId) return deny("LEASE_REQUIRED");
      if (!e.authorization.scopeHash) return deny("SCOPE_HASH_REQUIRED");
      if (expectedLeaseId && e.authorization.leaseId !== expectedLeaseId) return deny("LEASE_MISMATCH");
      if (expectedScopeHash && e.authorization.scopeHash !== expectedScopeHash) return deny("SCOPE_MISMATCH");
    }
    seen[e.nonce] = true;
    return {ok:true,status:"ACCEPTED"};
  }

  function commandAllowlist() {
    return {
      "project.inspect":true,
      "composition.inspect":true,
      "layer.inspect":true,
      "renderQueue.inspect":true,
      "composition.create":true,
      "layer.create":true,
      "layer.update":true,
      "keyframe.create":true,
      "effect.add":true,
      "renderQueue.configure":true,
      "project.save":true
    };
  }

  function authorizeCommand(e) {
    if (!commandAllowlist()[e.action]) return deny("COMMAND_NOT_ALLOWED", e.action);
    if (e.phase === "APPLY" && e.action === "script.execute") return deny("SCRIPT_EXECUTION_REQUIRES_DEDICATED_SANDBOX");
    return {ok:true,status:"AUTHORIZED"};
  }

  $.global.AEBOSS_HostGovernor = {
    validateEnvelope: validateEnvelope,
    authorizeCommand: authorizeCommand
  };
}());
