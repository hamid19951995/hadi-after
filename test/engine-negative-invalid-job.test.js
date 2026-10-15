const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { runJob } = require('../src/engine/engine');

const repoRoot = path.resolve(__dirname, '..');
const tempDir = path.join(repoRoot, 'test', '.tmp-stage3-negative');
fs.mkdirSync(tempDir, { recursive: true });

const scriptPath = path.join(tempDir, 'echo-negative.js');
const manifestPath = path.join(tempDir, 'manifest.json');
fs.writeFileSync(
  scriptPath,
  "const payload = { status: 'verified' }; process.stdout.write(JSON.stringify(payload));\n",
  'utf8'
);
fs.writeFileSync(
  manifestPath,
  JSON.stringify({ ok: true, source: 'manifest', version: 1 }, null, 2),
  'utf8'
);

const validBaseJob = {
  jobId: 'job-stage3-failure',
  opId: 'op-stage3-failure',
  stage: 'verify',
  createdAt: '2026-10-15T12:30:00.000Z',
  issuer: 'engine-negative-test',
  policy: {
    retries: 0,
    timeouts: {
      stepMs: 10000,
      verificationMs: 10000,
    },
  },
  manifestRef: 'test/.tmp-stage3-negative/manifest.json',
  inputs: {
    source: 'negative-test',
  },
  inputHash: 'sha256:negative',
  steps: [
    {
      id: 'step-1',
      name: 'run output script',
      type: 'script',
      runScript: {
        path: 'test/.tmp-stage3-negative/echo-negative.js',
      },
      expectedState: {
        status: 'verified',
      },
    },
  ],
  expectedState: {
    'step-1': {
      status: 'verified',
    },
  },
  evidencePath: path.join(tempDir, 'negative-receipt.json'),
};

const invalidReceipt = runJob({ ...validBaseJob, jobId: '' }, { workspaceRoot: repoRoot });
assert.strictEqual(invalidReceipt.status, 'failed');
assert.ok(invalidReceipt.error.includes('jobId') || invalidReceipt.error.includes('Job must be an object'));

const failedVerificationJob = {
  ...validBaseJob,
  evidencePath: path.join(tempDir, 'failed-verification.json'),
  steps: [
    {
      id: 'step-1',
      name: 'force mismatch',
      type: 'script',
      runScript: {
        path: 'test/.tmp-stage3-negative/echo-negative.js',
      },
      expectedState: {
        status: 'mismatch',
      },
    },
  ],
  expectedState: {
    'step-1': {
      status: 'mismatch',
    },
  },
};

const failedReceipt = runJob(failedVerificationJob, { workspaceRoot: repoRoot });
assert.strictEqual(failedReceipt.status, 'failed');
assert.ok(failedReceipt.trace.some((entry) => entry.step === 'error' || (entry.step === 'step-1' && entry.status === 'running')));
assert.ok(failedReceipt.error.includes('expected') || failedReceipt.error.includes('observed'));

console.log('engine negative tests passed');
