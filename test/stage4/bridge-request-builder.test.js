'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  buildBridgeRequest
} = require('../../src/engine/bridge_request_builder');

const TMP_TEST_DIR = path.resolve(__dirname, '..', '.tmp-stage4-builder');

function cleanTmpDir() {
  if (fs.existsSync(TMP_TEST_DIR)) {
    fs.rmSync(TMP_TEST_DIR, { recursive: true, force: true });
  }
}

function makeValidJob(overrides = {}) {
  const jobId = overrides.jobId || 'job-s4-001';
  return {
    jobId,
    opId: 'op-stage4-001',
    stage: 'stage4-poc',
    inputs: { testKey: 'val' },
    inputHash: 'sha256:abcd1234efgh5678',
    steps: [
      {
        stepId: 'step-1-create-comp',
        type: 'script',
        runScript: { path: 'scripts/make_comp.jsx' },
        expectedState: { status: 'verified' }
      },
      {
        stepId: 'step-2-add-layer',
        type: 'script',
        runScript: { path: 'scripts/add_layer.jsx' },
        expectedState: { layerCount: 1 }
      }
    ],
    policy: {
      timeoutMs: 30000,
      retries: 0
    },
    evidencePath: `evidence/ae/${jobId}/receipt.json`,
    ...overrides
  };
}

cleanTmpDir();

try {
  // Test 1: valid job becomes request; order preserved; file written
  const validJob = makeValidJob();
  const res = buildBridgeRequest({ job: validJob, repoRoot: TMP_TEST_DIR });

  assert.equal(res.request.jobId, validJob.jobId);
  assert.equal(res.request.opId, validJob.opId);
  assert.equal(res.request.inputHash, validJob.inputHash);
  assert.ok(res.request.correlationId);

  assert.equal(res.request.actions.length, 2);
  assert.equal(res.request.actions[0].actionId, 'step-1-create-comp');
  assert.equal(res.request.actions[1].actionId, 'step-2-add-layer');

  assert.ok(fs.existsSync(res.requestFilePath));
  const written = JSON.parse(fs.readFileSync(res.requestFilePath, 'utf8'));
  assert.equal(written.jobId, validJob.jobId);

  console.log('✓ Test 1: valid job transforms and preserves order');

  // Test 2: invalid job rejected (Stage 3 validation)
  const invalidJob = makeValidJob({ opId: '' });
  assert.throws(
    () => buildBridgeRequest({ job: invalidJob, repoRoot: TMP_TEST_DIR }),
    (err) => (err && String(err.message).includes('opId')),
    'Should throw validation error mentioning opId'
  );
  console.log('✓ Test 2: invalid job rejected');

  // Test 8: evidence sandbox (must stay within evidence/ae/<jobId>/)
  const escapingJob = makeValidJob({
    jobId: 'job-escape-01',
    evidencePath: 'contracts/stolen-receipt.json'
  });

  assert.throws(
    () => buildBridgeRequest({ job: escapingJob, repoRoot: TMP_TEST_DIR }),
    (err) => (err && String(err.message).includes('Security/Sandbox violation')),
    'Should reject evidencePath outside evidence/ae/<jobId>/'
  );

  const traversalJob = makeValidJob({
    jobId: 'job-traversal-01',
    evidencePath: 'evidence/ae/job-traversal-01/../../root-breach.json'
  });

  assert.throws(
    () => buildBridgeRequest({ job: traversalJob, repoRoot: TMP_TEST_DIR }),
    (err) => (err && String(err.message).includes('Security/Sandbox violation')),
    'Should reject traversal evidencePath'
  );

  console.log('✓ Test 8: sandbox containment verified');
  console.log('ALL bridge_request_builder tests passed.');
} finally {
  cleanTmpDir();
}
