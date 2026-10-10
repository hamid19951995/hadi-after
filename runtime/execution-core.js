(function (root, factory) {
    "use strict";
    if (typeof module !== "undefined" && module.exports) module.exports = factory(require("./offline-core.js"));
    else root.AEBossExecutionCore = factory(root.AEBossOfflineCore);
})(typeof window !== "undefined" ? window : this, function (offlineCore) {
    "use strict";
    var VERSION = "execution-core.v1";
    var ACTION_STATES = ["PENDING", "RUNNING", "VERIFYING", "COMPLETED", "FAILED", "SKIPPED", "CANCELLED"];
    var PERMISSION_MODES = ["DENY", "ASK", "SESSION", "PERSISTENT"];
    var transitions = { PENDING: ["RUNNING", "SKIPPED", "CANCELLED"], RUNNING: ["VERIFYING", "FAILED", "CANCELLED"], VERIFYING: ["COMPLETED", "FAILED", "CANCELLED"], COMPLETED: [], FAILED: ["PENDING", "CANCELLED"], SKIPPED: [], CANCELLED: ["PENDING"] };
    function now() { return new Date().toISOString(); }
    function clone(value) { return JSON.parse(JSON.stringify(value)); }
    function hash(value) { return offlineCore.hash(value); }
    function PermissionManager(initial) { this.grants = Object.assign({}, initial || {}); }
    PermissionManager.prototype.mode = function (capability) { return this.grants[capability] || "ASK"; };
    PermissionManager.prototype.request = function (capability, decision) { if (PERMISSION_MODES.indexOf(decision) < 0) return { ok: false, error: "INVALID_PERMISSION_DECISION" }; if (decision === "DENY") delete this.grants[capability]; else this.grants[capability] = decision; return { ok: decision !== "DENY", capability: capability, mode: decision, timestamp: now() }; };
    PermissionManager.prototype.revoke = function (capability) { delete this.grants[capability]; return { ok: true, capability: capability, mode: "DENY", timestamp: now() }; };
    function createJob(plan, context) { var jobId = "job-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8); return { jobId: jobId, version: VERSION, planFingerprint: plan && plan.fingerprint, state: "PENDING", currentStep: 0, completedSteps: [], contextSnapshot: clone(context || {}), verificationResults: [], history: [{ from: null, to: "PENDING", at: now() }] }; }
    function transition(job, next) { if (!job || ACTION_STATES.indexOf(next) < 0 || (transitions[job.state] || []).indexOf(next) < 0) return { ok: false, error: "INVALID_ACTION_TRANSITION", from: job && job.state, to: next }; var previous = job.state; job.state = next; job.history.push({ from: previous, to: next, at: now() }); return { ok: true, job: job }; }
    function checkpoint(job, plan) { return { jobId: job.jobId, planFingerprint: plan && plan.fingerprint, currentStep: job.currentStep, completedSteps: clone(job.completedSteps), contextSnapshot: clone(job.contextSnapshot), verificationResults: clone(job.verificationResults), timestamp: now(), fingerprint: hash({ jobId: job.jobId, planFingerprint: plan && plan.fingerprint, currentStep: job.currentStep, completedSteps: job.completedSteps, contextSnapshot: job.contextSnapshot, verificationResults: job.verificationResults }) }; }
    function canResume(plan, saved) { return !!(plan && saved && plan.fingerprint && saved.planFingerprint === plan.fingerprint); }
    function recordEvidence(job, before, action, after, verification) { var entry = offlineCore.evidence(before, action, after, verification, job.planFingerprint); job.evidence = (job.evidence || []).concat([entry]); return entry; }
    function actionContract(action) { return { actionId: action.id, input: clone(action.input || {}), expectedResult: action.verify || null, permission: action.capability || "ae.project.read", timeoutMs: action.timeoutMs || 30000, retryPolicy: action.retryPolicy || { maxAttempts: 0 }, checkpointPolicy: action.checkpoint === false ? "never" : "after-verify", verificationPolicy: action.verify ? "required" : "required" }; }
    return { VERSION: VERSION, ACTION_STATES: ACTION_STATES, PERMISSION_MODES: PERMISSION_MODES, PermissionManager: PermissionManager, createJob: createJob, transition: transition, checkpoint: checkpoint, canResume: canResume, recordEvidence: recordEvidence, actionContract: actionContract };
});
