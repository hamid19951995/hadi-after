const assert = require('assert');
const { validateJob, validateJobOrThrow } = require('../src/engine/job_validate');

const baseJob = {
  jobId: 'job-0001',
  opId: 'op-0001',
  stage: 'verify',
  createdAt: '2026-10-15T10:00:00.000Z',
  issuer: 'deterministic-engine',
  policy: {
    retries: 2,
    timeouts: {
      stepMs: 15000,
      verificationMs: 15000,
    },
  },
  manifestRef: 'test/fixtures/manifest.json',
  inputs: {
    source: 'schema-validation',
    repeatable: true,
  },
  inputHash: 'sha256:abcd1234',
  steps: [
    {
      id: 'step-1',
      name: 'echo status',
      type: 'script',
      runScript: {
        path: 'test/fixtures/echo.js',
        args: ['--status', 'verified'],
      },
      expectedState: {
        status: 'verified',
      },
    },
  ],
  expectedState: {
    status: 'verified',
  },
  evidencePath: 'test/evidence/job-schema.json',
};

const validResult = validateJob(baseJob);
assert.strictEqual(validResult.valid, true, validResult.errors.join('; '));
assert.deepStrictEqual(validResult.errors, []);

assert.throws(() => validateJobOrThrow({ ...baseJob, jobId: '' }), /jobId/);

const invalidResult = validateJob({ ...baseJob, steps: 'not-an-array' });
assert.strictEqual(invalidResult.valid, false);
assert.ok(invalidResult.errors.some((error) => error.includes('steps')));

const malformedPolicy = validateJob({ ...baseJob, policy: { retries: 'two', timeouts: { stepMs: 5000, verificationMs: 5000 } } });
assert.strictEqual(malformedPolicy.valid, false);
assert.ok(malformedPolicy.errors.some((error) => error.includes('retries')));

console.log('job schema validation tests passed');
