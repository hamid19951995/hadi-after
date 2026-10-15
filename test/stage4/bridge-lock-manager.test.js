'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { BridgeLockManager } = require('../../src/engine/bridge_lock_manager');

const TMP_TEST_DIR = path.resolve(__dirname, '..', '.tmp-stage4-lock-test');

test.beforeEach(() => {
  if (fs.existsSync(TMP_TEST_DIR)) {
    fs.rmSync(TMP_TEST_DIR, { recursive: true, force: true });
  }
});

test.after(() => {
  if (fs.existsSync(TMP_TEST_DIR)) {
    fs.rmSync(TMP_TEST_DIR, { recursive: true, force: true });
  }
});

test('BridgeLockManager: acquires and releases lock cleanly', () => {
  const manager = new BridgeLockManager({ repoRoot: TMP_TEST_DIR });
  const res = manager.acquire({ jobId: 'job-alpha' });
  assert.equal(res.acquired, true);
  assert.equal(res.reclaimed, false);
  assert.ok(fs.existsSync(manager.lockFilePath));

  const rel = manager.release({ jobId: 'job-alpha' });
  assert.equal(rel.released, true);
  assert.ok(!fs.existsSync(manager.lockFilePath));
});

test('BridgeLockManager: rejects concurrent flight when owner is active', () => {
  const manager = new BridgeLockManager({ repoRoot: TMP_TEST_DIR });
  manager.acquire({ jobId: 'job-first' });

  const second = manager.acquire({ jobId: 'job-second' });
  assert.equal(second.acquired, false);
  assert.equal(second.reason, 'BRIDGE_LOCKED_BY_ACTIVE_PROCESS');
});

test('BridgeLockManager: reclaims stale lock when PID is dead', () => {
  const manager = new BridgeLockManager({ repoRoot: TMP_TEST_DIR });
  const deadLock = {
    lockVersion: '1.0.0',
    jobId: 'dead-job',
    pid: 99999999,
    timestampMs: Date.now()
  };
  fs.mkdirSync(manager.lockDir, { recursive: true });
  fs.writeFileSync(manager.lockFilePath, JSON.stringify(deadLock, null, 2));

  const res = manager.acquire({ jobId: 'reclaim-job', forceReclaimIfStale: true });
  assert.equal(res.acquired, true);
  assert.equal(res.reclaimed, true);
  assert.equal(res.previousLock.jobId, 'dead-job');
});
