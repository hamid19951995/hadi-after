const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { runJob } = require('../src/engine/engine');

const repoRoot = path.resolve(__dirname, '..');
const tempDir = path.join(repoRoot, 'test', '.tmp-stage3-engine');
fs.mkdirSync(tempDir, { recursive: true });

const scriptPath = path.join(tempDir, 'echo-stage3.js');
const manifestPath = path.join(tempDir, 'manifest.json');
const evidencePath = path.join(tempDir, 'engine-happy-path-receipt.json');

fs.writeFileSync(
  scriptPath,
  "const payload = { status: 'verified', count: 2 }; process.stdout.write(JSON.stringify(payload));\n",
  'utf8'
);
fs.writeFileSync(
  manifestPath,
  JSON.stringify({ ok: true, source: 'manifest', version: 1 }, null, 2),
  'utf8'
);

const job = {
  jobId: 'job-stage3-happy',
  opId: 'op-stage3-happy',
  stage: 'verify',
  createdAt: '2026-10-15T12:00:00.000Z',
  issuer: 'engine-happy-path-test',
  policy: {
    retries: 1,
    timeouts: {
      stepMs: 10000,
      verificationMs: 10000,
    },
  },
  manifestRef: 'test/.tmp-stage3-engine/manifest.json',
  inputs: {
    source: 'engine-happy-path-test',
    mode: 'deterministic',
  },
  inputHash: 'sha256:happy-path',
  steps: [
    {
      id: 'step-1',
      name: 'deterministic script run',
      type: 'script',
      runScript: {
        path: 'test/.tmp-stage3-engine/echo-stage3.js',
      },
      expectedState: {
        status: 'verified',
        count: 2,
      },
    },
    {
      id: 'step-2',
      name: 'verify manifest',
      type: 'verify',
      manifestRef: 'test/.tmp-stage3-engine/manifest.json',
      expectedState: {
        ok: true,
        source: 'manifest',
        version: 1,
      },
    },
  ],
  expectedState: {
    'step-2-manifest': {
      ok: true,
      source: 'manifest',
      version: 1,
    },
  },
  evidencePath: evidencePath,
};

const receipt = runJob(job, { workspaceRoot: repoRoot });
assert.strictEqual(receipt.status, 'verified');
assert.strictEqual(receipt.opId, job.opId);
assert.strictEqual(receipt.jobId, job.jobId);
assert.strictEqual(receipt.stage, job.stage);
assert.strictEqual(receipt.evidencePath, evidencePath);
assert.ok(receipt.outputHash, 'outputHash should be populated for verified jobs');
assert.ok(Array.isArray(receipt.trace), 'trace should be recorded');
assert.ok(receipt.trace.length >= 2, 'trace should include execution metadata');
assert.ok(fs.existsSync(evidencePath), 'receipt should be written to evidencePath');
assert.ok(receipt.trace.some((entry) => entry.step === 'step-1' && entry.status === 'verified'));

console.log('engine happy path tests passed');
