"use strict";

const offlineCore = require("../../runtime/offline-core");

const STATES = Object.freeze({ PLANNED: "PLANNED", DRY_RUN: "DRY_RUN", RUNNING: "RUNNING", VERIFYING: "VERIFYING", COMPLETED: "COMPLETED", FAILED: "FAILED", UNKNOWN: "UNKNOWN" });
const TERMINAL = new Set([STATES.COMPLETED, STATES.FAILED, STATES.UNKNOWN]);

function clone(value) { return value === undefined ? undefined : JSON.parse(JSON.stringify(value)); }
function assert(condition, message, code) { if (!condition) throw Object.assign(new Error(message), { code: code || "PRODUCTION_RUNTIME_ERROR" }); }

function canonicalPlan(plan) {
  assert(plan && Array.isArray(plan.steps), "plan with steps is required", "PLAN_REQUIRED");
  const steps = plan.steps.map((step) => ({ id: String(step.id), action: String(step.action), capability: step.capability || "ae.project.read", dependsOn: [...(step.dependsOn || [])].map(String).sort(), input: clone(step.input || {}), verify: step.verify || null })).sort((left, right) => left.id.localeCompare(right.id));
  const normalized = { version: plan.version || offlineCore.VERSION, intent: plan.intent || "unknown", parameters: clone(plan.parameters || {}), steps };
  normalized.fingerprint = offlineCore.hash(normalized);
  return normalized;
}

function orderedSteps(plan) {
  const byId = new Map(plan.steps.map((step) => [step.id, step]));
  const result = [], visiting = new Set(), visited = new Set();
  function visit(id) {
    assert(byId.has(id), `missing dependency: ${id}`, "MISSING_DEPENDENCY");
    if (visiting.has(id)) throw Object.assign(new Error(`circular dependency: ${id}`), { code: "CIRCULAR_DEPENDENCY" });
    if (visited.has(id)) return;
    visiting.add(id); [...byId.get(id).dependsOn].sort().forEach(visit); visiting.delete(id); visited.add(id); result.push(byId.get(id));
  }
  [...byId.keys()].sort().forEach(visit);
  return result;
}

function createJob(plan) { const canonical = canonicalPlan(plan); return { jobId: `job-${canonical.fingerprint}`, plan: canonical, state: STATES.PLANNED, completed: [], evidence: [], checkpoint: null, certificate: null }; }
function record(job, type, data) { job.evidence.push({ type, data: clone(data) }); }

function dryRun(job, permissions = {}) {
  assert(job.state === STATES.PLANNED, "dry-run requires PLANNED job", "INVALID_STATE");
  const steps = orderedSteps(job.plan), blocked = steps.filter((step) => permissions[step.capability] === "DENY").map((step) => step.id);
  const result = { ready: blocked.length === 0, blocked, steps: steps.map((step) => step.id), fingerprint: job.plan.fingerprint };
  record(job, "dry-run", result); job.state = result.ready ? STATES.DRY_RUN : STATES.FAILED; return result;
}

async function execute(job, hostExecute, verify) {
  assert(typeof hostExecute === "function", "hostExecute callback required", "HOST_EXECUTOR_REQUIRED");
  assert(typeof verify === "function", "verify callback required", "VERIFIER_REQUIRED");
  assert(job.state === STATES.DRY_RUN, "execution requires a successful dry-run", "DRY_RUN_REQUIRED");
  const steps = orderedSteps(job.plan); job.state = STATES.RUNNING;
  for (const step of steps) {
    try {
      const readback = await hostExecute(clone(step), clone(job)); record(job, "readback", { stepId: step.id, readback });
      assert(readback && readback.ok === true, `readback failed for ${step.id}`, "READBACK_FAILED"); job.state = STATES.VERIFYING;
      const verification = await verify(clone(step), clone(readback), clone(job)); record(job, "verification", { stepId: step.id, verification });
      assert(verification && verification.verified === true, `verification failed for ${step.id}`, "VERIFICATION_FAILED");
      job.completed.push(step.id); job.checkpoint = { planFingerprint: job.plan.fingerprint, lastVerifiedNode: step.id, completed: [...job.completed] }; job.state = STATES.RUNNING;
    } catch (error) {
      record(job, "error", { stepId: step.id, code: error.code || "EXECUTION_ERROR", message: error.message }); job.state = error.code === "READBACK_FAILED" || error.code === "VERIFICATION_FAILED" ? STATES.UNKNOWN : STATES.FAILED; return job;
    }
  }
  job.state = STATES.COMPLETED; job.certificate = { job: job.jobId, status: job.state, planFingerprint: job.plan.fingerprint, nodesTotal: steps.length, nodesVerified: job.completed.length }; record(job, "certificate", job.certificate); return job;
}

module.exports = { STATES, TERMINAL, canonicalPlan, orderedSteps, createJob, dryRun, execute };