'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const core = require('../runtime/offline-core');

const fixturePath = path.join(__dirname, 'fixtures', 'golden-fingerprints.json');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
assert.strictEqual(fixture.formatVersion, 1);
assert.ok(Array.isArray(fixture.vectors) && fixture.vectors.length > 0);

function fingerprintFor(vector) {
  if (vector.kind === 'hash') return core.hash(vector.input.value);

  const resolution = core.resolveIntent(vector.input.request, vector.input.context);
  const compiled = core.compilePlan(resolution, vector.input.context);
  assert.strictEqual(compiled.ok, true, `${vector.name} should compile`);

  if (vector.kind === 'plan') return compiled.fingerprint;
  if (vector.kind === 'checkpoint') {
    const input = vector.input;
    return core.checkpoint(input.jobId, compiled.plan, input.currentStep, input.completedSteps, input.contextSnapshot, input.verificationResults).fingerprint;
  }
  throw new Error(`Unknown golden vector kind: ${vector.kind}`);
}

for (const vector of fixture.vectors) {
  assert.match(vector.expectedFingerprint, /^[0-9a-f]{8}-[0-9a-f]+$/, `${vector.name} has a fixed golden fingerprint`);
  assert.strictEqual(fingerprintFor(vector), vector.expectedFingerprint, `${vector.name} fingerprint changed`);
}

const firstHashVector = fixture.vectors.find(vector => vector.kind === 'hash');
assert.strictEqual(core.hash({ alpha: 1, beta: { left: true, right: false } }), core.hash({ beta: { right: false, left: true }, alpha: 1 }));
assert.ok(firstHashVector);
console.log(`fingerprint: PASS (${fixture.vectors.length} golden vectors)`);