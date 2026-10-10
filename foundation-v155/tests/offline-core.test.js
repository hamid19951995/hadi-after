const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../../runtime/offline-core.js');
const networkAudit = require('../../runtime/network-audit.js');
const execution = require('../../runtime/execution-core.js');
const cache = require('../../runtime/offline-cache.js');
const productionSpec = require('../../runtime/production-spec.js');

test('resolves Persian and English AE intents deterministically', () => {
  const composition = core.resolveIntent('یک کامپوزیشن 1920x1080 با مدت 10 ثانیه بساز');
  assert.equal(composition.intent, 'createComposition');
  assert.equal(composition.state, 'RESOLVED');
  assert.equal(composition.parameters.width, 1920);
  assert.equal(composition.parameters.height, 1080);
  assert.equal(composition.parameters.duration, 10);
  assert.equal(core.resolveIntent('add a text layer').intent, 'addText');
  assert.equal(core.resolveIntent('animate it', { lastCreatedLayer: 'OMEGA_TEXT' }).parameters.target, 'OMEGA_TEXT');
});

test('low confidence requests require clarification', () => {
  const result = core.resolveIntent('make something beautiful');
  assert.equal(result.state, 'CLARIFICATION_REQUIRED');
  assert.equal(result.intent, 'unsupported');
});

test('compiles a graphable plan with stable fingerprint', () => {
  const intent = core.resolveIntent('Create a 10 second composition named Intro');
  const first = core.compilePlan(intent, { activeProject: 'Untitled' });
  const second = core.compilePlan(intent, { activeProject: 'Untitled' });
  assert.equal(first.ok, true);
  assert.equal(first.fingerprint, second.fingerprint);
  assert.equal(core.validateGraph(first.plan).ok, true);
  assert.equal(first.plan.steps.at(-1).verify, 'expectedState.matches');
});

test('rejects missing and circular dependencies', () => {
  const missing = core.validateGraph({ steps: [{ id: 'b', dependsOn: ['missing'] }] });
  assert.equal(missing.ok, false);
  assert.equal(missing.errors[0].code, 'MISSING_DEPENDENCY');
  const circular = core.validateGraph({ steps: [{ id: 'a', dependsOn: ['b'] }, { id: 'b', dependsOn: ['a'] }] });
  assert.equal(circular.ok, false);
  assert.equal(circular.errors.some(error => error.code === 'CIRCULAR_DEPENDENCY'), true);
});

test('checkpoint resume requires matching plan fingerprint', () => {
  const intent = core.resolveIntent('render composition');
  const compiled = core.compilePlan(intent, {});
  const saved = core.checkpoint('job-1', compiled.plan, 'queue_render', ['create_comp'], {}, []);
  assert.equal(core.canResume(compiled.plan, saved), true);
  assert.equal(core.canResume({ fingerprint: 'different' }, saved), false);
});

test('offline network audit reports blocking findings', () => {
  const audit = core.auditNetworkText('fetch("https://example.com")', 'test.js');
  assert.equal(audit.ok, false);
  assert.equal(audit.findings[0].policy, 'OFFLINE_STRICT_BLOCK');
});

test('static network audit classifies external dependencies', () => {
  const findings = networkAudit.scanText('fetch("https://example.com"); sendBeacon("https://telemetry.example"); @import url("https://fonts.googleapis.com/css");', 'panel.css');
  assert.equal(findings.some(finding => finding.type === 'fetch'), true);
  assert.equal(findings.some(finding => finding.type === 'remote-url'), true);
  assert.equal(findings.some(finding => finding.type === 'external-font'), true);
  assert.equal(findings.some(finding => finding.type === 'telemetry'), true);
});

test('execution core enforces capabilities and action transitions', () => {
  const permissions = new execution.PermissionManager();
  assert.equal(permissions.request('ae.project.write', 'SESSION').ok, true);
  assert.equal(permissions.mode('ae.project.write'), 'SESSION');
  const contract = execution.actionContract({ id: 'create_comp', input: { name: 'Intro' }, capability: 'ae.project.write', verify: 'composition.exists' });
  assert.equal(contract.permission, 'ae.project.write');
  assert.equal(contract.verificationPolicy, 'required');
  const job = execution.createJob({ fingerprint: 'plan-a' }, { activeProject: 'Untitled' });
  assert.equal(execution.transition(job, 'RUNNING').ok, true);
  assert.deepEqual(job.history[1].from, 'PENDING');
  assert.deepEqual(job.history[1].to, 'RUNNING');
  assert.equal(execution.transition(job, 'COMPLETED').ok, false);
  assert.equal(execution.transition(job, 'VERIFYING').ok, true);
  assert.equal(execution.transition(job, 'COMPLETED').ok, true);
});

test('execution checkpoint blocks incompatible resume and records evidence', () => {
  const plan = { fingerprint: 'plan-a' };
  const job = execution.createJob(plan, {});
  job.currentStep = 2;
  job.completedSteps = ['create_comp'];
  const checkpoint = execution.checkpoint(job, plan);
  assert.equal(execution.canResume(plan, checkpoint), true);
  assert.equal(execution.canResume({ fingerprint: 'plan-b' }, checkpoint), false);
  const evidence = execution.recordEvidence(job, { items: 0 }, { actionId: 'create_comp' }, { items: 1 }, { match: true });
  assert.equal(evidence.fingerprint.length > 0, true);
  assert.equal(job.evidence.length, 1);
});

test('offline cache verifies integrity and invalidates tampered entries', () => {
  const storage = { values: {}, getItem(key) { return this.values[key] || null; }, setItem(key, value) { this.values[key] = value; }, removeItem(key) { delete this.values[key]; } };
  const store = new cache.Cache(storage);
  const entry = store.put('plan', { request: 'create' }, { fingerprint: 'abc' });
  assert.equal(store.get('plan', { request: 'create' }).value.fingerprint, 'abc');
  storage.values[entry.key] = storage.values[entry.key].replace('abc', 'tampered');
  assert.equal(store.get('plan', { request: 'create' }), null);
});

test('production specification creates deterministic scenes and executable steps', () => {
  const request = 'Create a cinematic 15-second technology advertisement, dark futuristic background, three text sections, camera movement and premium ending.';
  const spec = productionSpec.create(request, {});
  assert.equal(spec.project.duration, 15);
  assert.equal(spec.project.width, 1920);
  assert.equal(spec.project.camera, true);
  assert.equal(spec.text.sections, 3);
  assert.equal(spec.scenes.length, 4);
  assert.equal(spec.scenes[0].start, 0);
  assert.equal(spec.scenes.at(-1).end, 15);
  const plan = productionSpec.compile(spec);
  assert.equal(plan.steps.some(step => step.action === 'createProject'), true);
  assert.equal(plan.steps.some(step => step.action === 'animateSelectedPosition'), true);
  assert.equal(plan.steps.some(step => step.action === 'queueComposition'), true);
  assert.equal(plan.fingerprint.length > 0, true);
});
