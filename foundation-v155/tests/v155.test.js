'use strict';
const assert = require('assert');
const { evaluate } = require('../runtime/assurance-frontier');
const runtime = require('../runtime/production-runtime');

async function main() {
	assert.strictEqual(evaluate({ traceStable: true, causalConsistent: true, evidenceQuorum: true, regressionBudget: true }).status, 'LIVE_INTEGRATION_REQUIRED');
	assert.strictEqual(evaluate({ traceStable: true }).status, 'LOCAL_ASSURANCE_INCOMPLETE');
	const input = { version: 'production.v1', intent: 'motion_graphics', parameters: { duration: 10 }, steps: [
		{ id: 'animate_title', action: 'animate', dependsOn: ['create_comp'], capability: 'ae.project.write', verify: 'keyframes.exists' },
		{ id: 'create_comp', action: 'createComposition', dependsOn: [], capability: 'ae.project.write', verify: 'composition.exists' }
	] };
	const first = runtime.createJob(input);
	const second = runtime.createJob({ ...input, steps: [...input.steps].reverse() });
	assert.strictEqual(first.plan.fingerprint, second.plan.fingerprint);
	assert.deepStrictEqual(runtime.orderedSteps(first.plan).map((step) => step.id), ['create_comp', 'animate_title']);
	assert.throws(() => runtime.createJob({ ...input, steps: [] }), { code: 'EMPTY_PLAN' });
	assert.throws(() => runtime.createJob({ ...input, steps: [input.steps[0], input.steps[0]] }), { code: 'DUPLICATE_STEP_ID' });
	assert.throws(() => runtime.createJob({ ...input, steps: [{ ...input.steps[0], verify: null }] }), { code: 'VERIFICATION_CONTRACT_REQUIRED' });
	const missingPermission = runtime.createJob(input);
	const blocked = runtime.dryRun(missingPermission);
	assert.strictEqual(blocked.ready, false);
	assert.strictEqual(blocked.status, 'BLOCKED');
	assert.strictEqual(missingPermission.state, runtime.STATES.BLOCKED);
	await assert.rejects(runtime.execute(missingPermission, async () => ({ ok: true }), async () => ({ verified: true })), { code: 'DRY_RUN_REQUIRED' });
	let hostCalls = 0;
	assert.deepStrictEqual(runtime.dryRun(first, { 'ae.project.write': 'ALLOW' }), { ready: true, status: 'READY', blocked: [], steps: ['create_comp', 'animate_title'], fingerprint: first.plan.fingerprint });
	assert.strictEqual(hostCalls, 0);
	await runtime.execute(first, async (step) => { hostCalls += 1; return { ok: true, objectId: step.id }; }, async (step, readback) => ({ verified: readback.objectId === step.id }));
	assert.strictEqual(first.state, runtime.STATES.COMPLETED);
	assert.strictEqual(first.certificate.nodesVerified, 2);
	assert.strictEqual(first.evidence.filter((entry) => entry.type === 'verification').length, 2);
	assert.strictEqual(hostCalls, 2);
	const failed = runtime.createJob(input);
	runtime.dryRun(failed, { 'ae.project.write': 'ALLOW' });
	await runtime.execute(failed, async () => ({ ok: true }), async () => ({ verified: false }));
	assert.strictEqual(failed.state, runtime.STATES.UNKNOWN);
	assert.strictEqual(failed.certificate, null);
	console.log('v155 PASS');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
