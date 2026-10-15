"use strict";

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { validateJobOrThrow } = require('./job_validate');

function canonicalize(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((entry) => canonicalize(entry));
  if (typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((result, key) => {
        result[key] = canonicalize(value[key]);
        return result;
      }, {});
  }
  return value;
}

function stableHash(value) {
  const payload = JSON.stringify(canonicalize(value));
  return crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
}

function normalizeExpectedState(value) {
  if (value === undefined) return undefined;
  return canonicalize(value);
}

function deepEqual(left, right) {
  return JSON.stringify(normalizeExpectedState(left)) === JSON.stringify(normalizeExpectedState(right));
}

function ensureParentDirectory(filePath) {
  if (!filePath) return;
  const dir = path.dirname(filePath);
  if (dir && dir !== '.' && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function resolvePath(candidate, workspaceRoot) {
  if (!candidate) return null;
  if (path.isAbsolute(candidate)) return candidate;
  return path.resolve(workspaceRoot, candidate);
}

function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required file: ${filePath}`);
  }
  const text = fs.readFileSync(filePath, 'utf8');
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Invalid JSON in ${filePath}: ${error.message}`);
  }
}

function runConfiguredScript(step, workspaceRoot) {
  const scriptSpec = typeof step.runScript === 'string' ? { path: step.runScript } : step.runScript;
  if (!scriptSpec || !scriptSpec.path) {
    throw new Error(`Step ${step.id || step.name} is missing a runScript path`);
  }

  const scriptPath = resolvePath(scriptSpec.path, workspaceRoot);
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`runScript target not found: ${scriptSpec.path}`);
  }

  const args = Array.isArray(scriptSpec.args) ? scriptSpec.args : [];
  const cwd = scriptSpec.cwd ? resolvePath(scriptSpec.cwd, workspaceRoot) : workspaceRoot;
  const stdout = execFileSync(process.execPath, [scriptPath].concat(args), {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let payload = stdout.trim();
  if (payload) {
    try {
      payload = JSON.parse(payload);
    } catch (error) {
      payload = payload;
    }
  }

  return { output: payload, stdout };
}

function buildReceiptBase(job) {
  return {
    opId: job && job.opId ? job.opId : null,
    jobId: job && job.jobId ? job.jobId : null,
    stage: job && job.stage ? job.stage : null,
    inputHash: job && job.inputHash ? job.inputHash : null,
    outputHash: '',
    status: 'queued',
    evidencePath: job && job.evidencePath ? job.evidencePath : null,
    trace: []
  };
}

function createFailedReceipt(job, trace, error) {
  const receipt = buildReceiptBase(job);
  receipt.status = 'failed';
  receipt.trace = trace;
  receipt.error = String(error && error.message ? error.message : error);
  return receipt;
}

function runJob(job, options = {}) {
  const workspaceRoot = options.workspaceRoot || process.cwd();
  const trace = [];

  try {
    validateJobOrThrow(job);
    const receipt = buildReceiptBase(job);
    receipt.status = 'running';

    const manifestReferences = [];
    if (job.manifestRef) {
      const manifestPath = resolvePath(job.manifestRef, workspaceRoot);
      const manifest = readJsonFile(manifestPath);
      manifestReferences.push({ ref: job.manifestRef, path: manifestPath, payload: manifest });
      trace.push({
        step: 'manifest-root',
        status: 'verified',
        manifestRef: job.manifestRef,
        manifest,
        ts: new Date().toISOString(),
      });
    }

    const stepOutputs = [];
    for (const step of job.steps) {
      const startedAt = new Date().toISOString();
      const stepTrace = {
        step: step.id || step.name || 'unnamed-step',
        name: step.name || step.id || 'unnamed-step',
        type: step.type || 'generic',
        status: 'running',
        startedAt,
      };
      trace.push(stepTrace);

      let actualState = null;
      if (step.runScript) {
        const result = runConfiguredScript(step, workspaceRoot);
        actualState = result.output;
        stepTrace.output = result.output;
        stepTrace.stdout = result.stdout;
        stepOutputs.push({ [step.id]: actualState });
      }

      if (step.manifestRef) {
        const manifestPath = resolvePath(step.manifestRef, workspaceRoot);
        const manifest = readJsonFile(manifestPath);
        actualState = manifest;
        stepTrace.manifest = manifest;
        stepTrace.manifestRef = step.manifestRef;
        stepOutputs.push({ [`${step.id}-manifest`]: manifest });
      }

      if (step.expectedState !== undefined) {
        if (!deepEqual(actualState, step.expectedState)) {
          throw new Error(`Step ${step.id} expected ${JSON.stringify(step.expectedState)} but observed ${JSON.stringify(actualState)}`);
        }
      }

      if (step.verify === false) {
        stepTrace.status = 'skipped';
      } else {
        stepTrace.status = 'verified';
      }
      stepTrace.completedAt = new Date().toISOString();
    }

    const finalState = stepOutputs.length > 0 ? stepOutputs[stepOutputs.length - 1] : (manifestReferences.length > 0 ? manifestReferences[manifestReferences.length - 1].payload : {});
    if (job.expectedState !== undefined && !deepEqual(finalState, job.expectedState)) {
      throw new Error(`Final expectedState mismatch: expected ${JSON.stringify(job.expectedState)}, observed ${JSON.stringify(finalState)}`);
    }

    const output = {
      opId: job.opId,
      jobId: job.jobId,
      stage: job.stage,
      inputs: job.inputs,
      steps: stepOutputs,
      manifest: manifestReferences.length > 0 ? manifestReferences[manifestReferences.length - 1].payload : null,
    };

    receipt.outputHash = stableHash(output);
    receipt.status = 'verified';
    receipt.trace = trace;
    receipt.completedAt = new Date().toISOString();

    if (job.evidencePath) {
      ensureParentDirectory(job.evidencePath);
      const evidence = { receipt: { ...receipt }, job };
      fs.writeFileSync(job.evidencePath, JSON.stringify(evidence, null, 2), 'utf8');
    }

    return receipt;
  } catch (error) {
    const failedReceipt = createFailedReceipt(job, trace.concat([{
      step: 'error',
      status: 'failed',
      error: String(error && error.message ? error.message : error),
      ts: new Date().toISOString(),
    }]), error);

    if (job && job.evidencePath) {
      try {
        ensureParentDirectory(job.evidencePath);
        fs.writeFileSync(job.evidencePath, JSON.stringify({ receipt: failedReceipt, job, error: failedReceipt.error }, null, 2), 'utf8');
      } catch (writeError) {
        // best effort: evidence writing must not break the refund state
      }
    }

    return failedReceipt;
  }
}

module.exports = {
  canonicalize,
  stableHash,
  runJob,
  executeJob: runJob,
};
