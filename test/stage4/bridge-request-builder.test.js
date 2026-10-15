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
    stage: 'verify',
    createdAt: new Date().toISOString(),
    issuer: 'stage4-test-runner',
    manifestRef: 'manifests/test-manifest.json',
    inputs: { testKey: 'val' },
    inputHash: 'sha256:abcd1234efgh5678',
    expectedState: { status: 'verified' },
    steps: [
      {
        id: 'step-1-create-comp',
        name: 'create-comp',
        type: 'script',
        runScript: { path: 'scripts/make_comp.jsx' },
        expectedState: { status: 'verified' }
      },
      {
        id: 'step-2-add-layer',
        name: 'add-layer',
        type: 'script',
        runScript: { path: 'scripts/add_layer.jsx' },
        expectedState: { layerCount: 1 }
      }
    ],
    policy: {
      retries: 0,
      timeouts: {
        stepMs: 15000,
        verificationMs: 5000
      }
    },
    evidencePath: `evidence/ae/${jobId}/receipt.json`,
    ...overrides
  };
}

cleanTmpDir();

try {
  // Test 1: تبدیل جاب معتبر و حفظ ترتیب اکشنها
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

  // Test 2: رد جاب فاقد فیلدهای الزامی
  const invalidJob = makeValidJob({ opId: '' });
  assert.throws(
    () => buildBridgeRequest({ job: invalidJob, repoRoot: TMP_TEST_DIR }),
    (err) => (err && String(err.message).includes('opId')),
    'Should throw validation error mentioning opId'
  );
  console.log('✓ Test 2: invalid job rejected');

  // Test 3: اعمال سندباکس دایرکتوری شواهد
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

  console.log('✓ Test 3: sandbox containment verified');
  console.log('\n>>> ALL bridge_request_builder tests passed! <<<');
} finally {
  cleanTmpDir();
}
