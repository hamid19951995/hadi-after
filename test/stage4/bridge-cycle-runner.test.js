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

test.beforeEach(() => ensureClean());
test.after(() => ensureClean());

test('BridgeCycleRunner: writes request and returns parsed response', async () => {
  const runner = new BridgeCycleRunner({
    repoRoot: TMP_TEST_DIR,
    pollIntervalMs: 25,
    maxWaitMs: 2000,
    consumeResponse: true
  });

  // minimal job that matches the canonical validator expectations in your repo
  const job = {
    id: 'job-cycle-001',
    createdAt: new Date().toISOString(),
    issuer: { type: 'test', id: 'node-test' },
    manifestRef: { kind: 'inline', id: 'manifest-test-1' },
    expectedState: { kind: 'render', version: 1 },
    policy: { timeouts: { totalMs: 10_000 } },
    steps: [
      { id: 's1', name: 'do', action: { type: 'noop' } }
    ]
  };

  // create a response later (simulating After Effects bridge)
  setTimeout(() => {
    const outboxDir = path.join(TMP_TEST_DIR, 'bridge', 'outbox');
    fs.mkdirSync(outboxDir, { recursive: true });
    const payload = {
      responseVersion: '1.0.0',
      jobId: job.id,
      status: 'succeeded',
      durationMs: 12,
      stepResults: [{ id: 's1', status: 'done' }]
    };
    fs.writeFileSync(path.join(outboxDir, 'current.response.json'), JSON.stringify(payload), 'utf8');
  }, 100);

  const result = await runner.runOnce(job);
  assert.equal(result.ok, true);
  assert.equal(result.response.status, 'succeeded');

  // consumed
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

  const job = {
    id: 'job-cycle-timeout',
    createdAt: new Date().toISOString(),
    issuer: { type: 'test', id: 'node-test' },
    manifestRef: { kind: 'inline', id: 'manifest-test-2' },
    expectedState: { kind: 'render', version: 1 },
    policy: { timeouts: { totalMs: 10_000 } },
    steps: [
      { id: 's1', name: 'do', action: { type: 'noop' } }
    ]
  };

  const result = await runner.runOnce(job);
  assert.equal(result.ok, false);
  assert.equal(result.code, 'BRIDGE_TIMEOUT');
});
