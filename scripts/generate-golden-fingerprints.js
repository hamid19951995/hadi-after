'use strict';

const fs = require('fs');
const path = require('path');
const core = require('../runtime/offline-core');

const fixturePath = path.resolve(__dirname, '..', 'test', 'fixtures', 'golden-fingerprints.json');
const args = process.argv.slice(2);
if (args.some(argument => argument !== '--force')) {
  console.error('Usage: node scripts/generate-golden-fingerprints.js [--force]');
  process.exit(2);
}

const force = args.includes('--force');
if (fs.existsSync(fixturePath) && !force) {
  console.error('Golden fixture already exists; pass --force to intentionally replace its expected fingerprints.');
  process.exit(1);
}

function fingerprintFor(vector) {
  if (vector.kind === 'hash') return core.hash(vector.input.value);

  const resolution = core.resolveIntent(vector.input.request, vector.input.context);
  const compiled = core.compilePlan(resolution, vector.input.context);
  if (!compiled.ok) throw new Error(`Could not compile golden vector ${vector.name}`);

  if (vector.kind === 'plan') return compiled.fingerprint;
  if (vector.kind === 'checkpoint') {
    const input = vector.input;
    return core.checkpoint(input.jobId, compiled.plan, input.currentStep, input.completedSteps, input.contextSnapshot, input.verificationResults).fingerprint;
  }
  throw new Error(`Unknown golden vector kind: ${vector.kind}`);
}

try {
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  fixture.vectors = fixture.vectors.map(vector => ({ ...vector, expectedFingerprint: fingerprintFor(vector) }));
  fs.writeFileSync(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`, { encoding: 'utf8', flag: force ? 'w' : 'wx' });
  console.log(`Wrote ${fixture.vectors.length} golden fingerprints to ${fixturePath}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}