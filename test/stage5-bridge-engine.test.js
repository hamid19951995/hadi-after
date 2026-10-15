'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { runJob } = require('../src/engine/engine');

const FIXED_TIMESTAMP = '2026-10-15T12:00:00.000Z';

function makeTempRepo(jobId) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-stage5-engine-test-'));
  fs.mkdirSync(path.join(dir, 'bridge', 'inbox'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'bridge', 'outbox'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'bridge', 'locks'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'manifests'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'evidence', 'ae', jobId), { recursive: true });

  const manifestPath = path.join(dir, 'manifests', 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify({ ok: true, version: 1 }, null, 2), 'utf8');

  return { dir, manifestPath };
}

function createValidJob(repoRoot, manifestPath, jobId, overrides = {}) {
  const relEvidencePath = path.join('evidence', 'ae', jobId, 'receipt.json').replace(/\\/g, '/');
  return {
    jobId,
    opId: `op-${jobId}`,
    stage: 'bridge-verify',
    createdAt: FIXED_TIMESTAMP,
    issuer: 'stage5-bridge-test',
    policy: {
      retries: 0,
      timeouts: {
        stepMs: 5000,
        verificationMs: 5000,
      },
    },
    manifestRef: path.relative(repoRoot, manifestPath).replace(/\\/g, '/'),
    inputs: { test: true },
    inputHash: `sha256:${jobId}`,
    steps: overrides.steps || [
      {
        id: 'step-ae-dispatch',
        name: 'Dispatch Bridge Payload',
        type: 'bridge',
        bridge: {
          pollIntervalMs: 20,
          maxWaitMs: 3000,
        },
      },
    ],
    expectedState: overrides.expectedState,
    evidencePath: relEvidencePath,
    ...overrides,
  };
}

test('Stage 5 - Happy Path: Bridge step executes and yields verified receipt', async (t) => {
  const jobId = 'job-stage5-happy-001';
  const { dir: repoRoot, manifestPath } = makeTempRepo(jobId);
  t.after(() => fs.rmSync(repoRoot, { recursive: true, force: true }));

  const expectedBridgeState = {
    responseVersion: '1.0.0',
    jobId,
    requestId: null,
    status: 'succeeded',
    completedAt: FIXED_TIMESTAMP,
    durationMs: null,
    stepResults: [{ stepId: 'step-ae-dispatch', status: 'succeeded' }],
    errors: [],
    outputFiles: ['renders/output.mp4'],
  };

  const job = createValidJob(repoRoot, manifestPath, jobId, {
    expectedState: {
      'step-ae-dispatch': expectedBridgeState,
    },
  });

  const timer = setTimeout(() => {
    const outboxFile = path.join(repoRoot, 'bridge', 'outbox', 'current.response.json');
    const responsePayload = {
      responseVersion: '1.0.0',
      jobId,
      status: 'succeeded',
      completedAt: FIXED_TIMESTAMP,
      stepResults: [{ stepId: 'step-ae-dispatch', status: 'succeeded' }],
      outputFiles: ['renders/output.mp4'],
    };
    fs.writeFileSync(outboxFile, JSON.stringify(responsePayload, null, 2), 'utf8');
  }, 80);

  const receipt = await runJob(job, { workspaceRoot: repoRoot, bridgeOptions: { repoRoot } });
  clearTimeout(timer);

  assert.equal(receipt.status, 'verified', `Receipt status must be verified: ${receipt.error || ''}`);
  assert.equal(receipt.jobId, jobId);
  assert.ok(receipt.outputHash, 'Output hash must be generated');

  const lockFile = path.join(repoRoot, 'bridge', 'locks', 'active.lock');
  assert.equal(fs.existsSync(lockFile), false, 'Lock must be released');

  const fullEvidencePath = path.join(repoRoot, job.evidencePath);
  if (fs.existsSync(fullEvidencePath)) {
    const evidenceContent = JSON.parse(fs.readFileSync(fullEvidencePath, 'utf8'));
    const finalStatus = evidenceContent.status || (evidenceContent.receipt && evidenceContent.receipt.status);
    assert.equal(finalStatus, 'verified');
  }
});

test('Stage 5 - Timeout Failure: Bridge timeout yields failed receipt gracefully', async (t) => {
  const jobId = 'job-stage5-timeout-002';
  const { dir: repoRoot, manifestPath } = makeTempRepo(jobId);
  t.after(() => fs.rmSync(repoRoot, { recursive: true, force: true }));

  const job = createValidJob(repoRoot, manifestPath, jobId, {
    steps: [
      {
        id: 'step-timeout',
        name: 'Timeout Bridge Step',
        type: 'bridge',
        bridge: {
          pollIntervalMs: 20,
          maxWaitMs: 150,
        },
      },
    ],
    expectedState: null,
  });

  const receipt = await runJob(job, { workspaceRoot: repoRoot, bridgeOptions: { repoRoot } });

  assert.equal(receipt.status, 'failed', 'Receipt must indicate failure');
  assert.match(receipt.error, /BRIDGE_TIMEOUT/, `Expected BRIDGE_TIMEOUT, got: ${receipt.error}`);
});

test('Stage 5 - Hybrid Multi-step: Run script + Bridge step in sequence', async (t) => {
  const jobId = 'job-stage5-hybrid-003';
  const { dir: repoRoot, manifestPath } = makeTempRepo(jobId);
  t.after(() => fs.rmSync(repoRoot, { recursive: true, force: true }));

  const dummyScript = path.join(repoRoot, 'dummy-step.js');
  fs.writeFileSync(
    dummyScript,
    "const payload = { status: 'verified', calculated: 123 }; process.stdout.write(JSON.stringify(payload));\n",
    'utf8'
  );

  const expectedBridgeState = {
    responseVersion: '1.0.0',
    jobId,
    requestId: null,
    status: 'succeeded',
    completedAt: FIXED_TIMESTAMP,
    durationMs: null,
    stepResults: [{ stepId: 'step-ae-bridge', status: 'succeeded' }],
    errors: [],
    outputFiles: [],
  };

  const job = createValidJob(repoRoot, manifestPath, jobId, {
    steps: [
      {
        id: 'step-script-pre',
        name: 'Pre-computation',
        type: 'script',
        runScript: { path: 'dummy-step.js' },
        expectedState: { status: 'verified', calculated: 123 },
      },
      {
        id: 'step-ae-bridge',
        name: 'Bridge Invocation',
        type: 'bridge',
        bridge: {
          pollIntervalMs: 20,
          maxWaitMs: 3000,
        },
      },
    ],
    expectedState: {
      'step-ae-bridge': expectedBridgeState,
    },
  });

  const timer = setTimeout(() => {
    const outboxFile = path.join(repoRoot, 'bridge', 'outbox', 'current.response.json');
    const responsePayload = {
      responseVersion: '1.0.0',
      jobId,
      status: 'succeeded',
      completedAt: FIXED_TIMESTAMP,
      stepResults: [{ stepId: 'step-ae-bridge', status: 'succeeded' }],
      outputFiles: [],
    };
    fs.writeFileSync(outboxFile, JSON.stringify(responsePayload, null, 2), 'utf8');
  }, 80);

  const receipt = await runJob(job, { workspaceRoot: repoRoot, bridgeOptions: { repoRoot } });
  clearTimeout(timer);

  assert.equal(receipt.status, 'verified', `Expected verified receipt: ${receipt.error || ''}`);
  assert.ok(Array.isArray(receipt.trace), 'Receipt trace must be an array');
  assert.ok(receipt.trace.length >= 2, `Expected at least 2 trace entries, got ${receipt.trace.length}`);

  const verifiedEntries = receipt.trace.filter((entry) => entry && entry.status === 'verified');
  assert.ok(verifiedEntries.length >= 2, `Expected at least 2 verified trace entries, got ${verifiedEntries.length}`);
});
