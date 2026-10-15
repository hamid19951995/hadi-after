'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { BridgeCycleRunner } = require('../../src/engine/bridge_cycle_runner');

const TMP_TEST_DIR = path.resolve(__dirname, '..', '.tmp-stage4-cycle-test');

function ensureClean() {
  if (fs.existsSync(TMP_TEST_DIR)) {
    fs.rmSync(TMP_TEST_DIR, { recursive: true, force: true });
  }
}

function makeValidJob(overrides = {}) {
  const jobId = overrides.jobId || 'job-cycle-001';
  return {
    jobId,
    opId: 'op-stage4-001',
    stage: 'verify',
    createdAt: new Date().toISOString(),
    issuer: 'stage4-test-runner',
    manifestRef: 'manifests/test-manifest.json',
    inputs: { testKey: 'val' },
    inputHash: 'sha256:abcd1234efgh5678',
    expectedState: { status: 'verified' },
    evidencePath: path.join('evidence', 'ae', jobId, 'evidence.json'),
    steps: [
      {
        id: 'step-1-create-comp',
        name: 'create-comp',
        type: 'script',
        script: {
          engine: 'aftereffects',
          entry: 'noop.jsx'
        },
        outputs: [],
        policy: { timeouts: { stepMs: 1000 } }
      }
    ],
    policy: {
      retries: 0,
      timeouts: {
        stepMs: 1000,
        verificationMs: 1000,
        totalMs: 10000
      }
    }
  };
}

test.beforeEach(() => ensureClean());
test.after(() => ensureClean());

test('BridgeCycleRunner: writes request and returns parsed response', async () => {
  const runner = new BridgeCycleRunner({
    repoRoot: TMP_TEST_DIR,
    pollIntervalMs: 25,
    maxWaitMs: 2000,
    consumeResponse: true
  });

  const job = makeValidJob({ jobId: 'job-cycle-001' });

  setTimeout(() => {
    const outboxDir = path.join(TMP_TEST_DIR, 'bridge', 'outbox');
    fs.mkdirSync(outboxDir, { recursive: true });
    const payload = {
      responseVersion: '1.0.0',
      jobId: job.jobId,
      status: 'succeeded',
      durationMs: 12,
      stepResults: [{ id: 'step-1-create-comp', status: 'done' }]
    };
    fs.writeFileSync(path.join(outboxDir, 'current.response.json'), JSON.stringify(payload), 'utf8');
  }, 100);

  const result = await runner.runOnce(job);
  assert.equal(result.ok, true);
  assert.equal(result.response.status, 'succeeded');

  const responsePath = path.join(TMP_TEST_DIR, 'bridge', 'outbox', 'current.response.json');
  assert.equal(fs.existsSync(responsePath), false);
});

test('BridgeCycleRunner: times out when no response arrives', async () => {
  const runner = new BridgeCycleRunner({
    repoRoot: TMP_TEST_DIR,
    pollIntervalMs: 25,
    maxWaitMs: 200,
    consumeResponse: true
  });

  const job = makeValidJob({ jobId: 'job-cycle-timeout' });

  const result = await runner.runOnce(job);
  assert.equal(result.ok, false);
  assert.equal(result.code, 'BRIDGE_TIMEOUT');
});
