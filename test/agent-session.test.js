const assert = require('assert');
const agent = require('../runtime/agent-session');

function verifiedHostResult() {
    const hostReadback = { verified: true, strategy: 'semantic-readback' };
    return { ok: true, hostReadback, aepipe: { state: 'SUCCESS', evidence: [{ type: 'verification', verified: true, hostReadback }] } };
}

const summary = { project: 'test.aep', activeItem: 'Main', activeType: 'Composition', layerCount: 1, compositions: [{ name: 'Main', width: 1920, height: 1080, duration: 10, frameRate: 30, layers: 1, layerItems: [{ name: 'Title', type: 'TextLayer', text: 'Test', keyframes: { opacity: 2 } }] }], selectedLayers: [], projectItems: [], renderQueueCount: 0, renderQueueItems: [] };
const health = { ok: true, issueCount: 0, warningCount: 0, issues: [], warnings: [] };
const emptySummary = { project: 'test.aep', activeItem: 'Main', activeType: 'Composition', layerCount: 0, compositions: [{ name: 'Main', layers: 0, layerItems: [] }] };

assert.strictEqual(agent.classifyResponse({ done: true }), 'DONE');
assert.strictEqual(agent.classifyResponse({ clarificationRequired: true, reply: 'Which format?' }), 'CLARIFICATION_REQUIRED');
assert.strictEqual(agent.classifyResponse({ commands: [{ command: 'summary' }] }), 'CONTINUE');
assert.strictEqual(agent.classifyResponse({ done: true, commands: [{ command: 'createProject' }] }), 'CONTINUE');
assert.strictEqual(agent.requiresVisibleOutput('Create a finished motion graphic project'), true);
assert.strictEqual(agent.requiresVisibleOutput('Create an empty composition'), false);
assert.strictEqual(agent.hasVisibleLayers(emptySummary), false);
assert.strictEqual(agent.hasVisibleLayers(summary), true);

const session = agent.create('Create and finish a motion graphic');
const firstTurn = agent.acceptTurn(session, { commands: [{ command: 'createProject', payload: { name: 'Main' } }], done: false });
assert.strictEqual(firstTurn.turn, 1);
assert.strictEqual(agent.recordStep(session, 'createProject', verifiedHostResult(), true), true);
assert.strictEqual(agent.recordStep(session, 'addTextLayer', { ok: true, aepipe: { state: 'UNKNOWN' } }, true), false);

const active = agent.create('Build a title');
const initialTurn = agent.acceptTurn(active, { commands: [{ command: 'createProject' }], done: true });
assert.strictEqual(initialTurn.done, false, 'a pre-execution completion claim must not finish an agent turn');
agent.recordStep(active, 'createProject', verifiedHostResult(), true);
const observation = agent.recordObservation(active, summary, health);
assert.throws(() => agent.complete(active, 'Premature completion'), { code: 'AGENT_COMPLETION_NOT_CONFIRMED' });
assert.strictEqual(observation.compositions[0].layerItems[0].text, 'Test');
assert.strictEqual(observation.health.ok, true);
assert.match(agent.continuationPrompt(active), /Latest AE readback and health/);
assert.match(agent.continuationPrompt(active), /never mark a clarification as done/);
const secondTurn = agent.acceptTurn(active, { commands: [{ command: 'animateSelectedOpacity' }], done: false });
assert.strictEqual(secondTurn.turn, 2);
agent.recordStep(active, 'animateSelectedOpacity', verifiedHostResult(), true);
agent.recordObservation(active, summary, health);
const finalTurn = agent.acceptTurn(active, { done: true, reply: 'Finished after verifying the title.' });
assert.strictEqual(finalTurn.done, true);
agent.complete(active);
assert.strictEqual(active.status, 'COMPLETED');

const unverified = agent.create('No verified work');
agent.acceptTurn(unverified, { commands: [{ command: 'addTextLayer' }], done: false });
agent.recordObservation(unverified, summary, health);
agent.acceptTurn(unverified, { done: true });
assert.throws(() => agent.complete(unverified), { code: 'AGENT_VERIFIED_STEP_REQUIRED' });

const emptyBuild = agent.create('ساخت یک پروژه موشن گرافیک حرفه‌ای');
agent.acceptTurn(emptyBuild, { commands: [{ command: 'createProject' }] });
agent.recordStep(emptyBuild, 'createProject', verifiedHostResult(), true);
agent.recordObservation(emptyBuild, emptySummary, health);
agent.acceptTurn(emptyBuild, { done: true, reply: 'Built.' });
const blocker = agent.completionBlocker(emptyBuild);
assert.match(blocker, /no verified layers/i);
assert.throws(() => agent.complete(emptyBuild), { code: 'AGENT_DELIVERABLE_INCOMPLETE' });
assert.strictEqual(agent.rejectCompletion(emptyBuild, blocker), 3);
assert.strictEqual(emptyBuild.finishAfterBatch, false);
assert.match(agent.continuationPrompt(emptyBuild), /must be resolved before done:true[\s\S]*Add at least one suitable visible layer/);
agent.acceptTurn(emptyBuild, { commands: [{ command: 'addTextLayer' }] });
agent.recordStep(emptyBuild, 'addTextLayer', verifiedHostResult(), true);
agent.recordObservation(emptyBuild, summary, health);
agent.acceptTurn(emptyBuild, { done: true, reply: 'Built and checked.' });
assert.strictEqual(agent.completionBlocker(emptyBuild), '');
agent.complete(emptyBuild);
assert.strictEqual(emptyBuild.status, 'COMPLETED');

const forged = agent.create('Build a title');
assert.strictEqual(agent.recordStep(forged, 'createProject', { ok: true, aepipe: { state: 'SUCCESS' } }, true), false, 'a state label alone is not execution evidence');
const missingReadback = verifiedHostResult();
delete missingReadback.hostReadback;
assert.strictEqual(agent.recordStep(forged, 'addTextLayer', missingReadback, true), false);
const deniedEvidence = verifiedHostResult();
deniedEvidence.aepipe.evidence[0].verified = false;
assert.strictEqual(agent.recordStep(forged, 'addTextLayer', deniedEvidence, true), false);
const readOnly = { ok: true, aepipe: { state: 'SUCCESS', evidence: [{ type: 'read-only-verification', verified: true }] } };
assert.strictEqual(agent.recordStep(forged, 'summary', readOnly, true), true);

const stale = agent.create('Make an edit');
agent.acceptTurn(stale, { commands: [{ command: 'addTextLayer' }] });
agent.recordStep(stale, 'addTextLayer', verifiedHostResult(), true);
agent.recordObservation(stale, summary, health);
agent.acceptTurn(stale, { done: true });
agent.recordStep(stale, 'animateSelectedOpacity', verifiedHostResult(), true);
assert.throws(() => agent.complete(stale), { code: 'AGENT_COMPLETION_NOT_CONFIRMED' });
assert.match(agent.completionBlocker(stale), /fresh AE readback/);
agent.acceptTurn(stale, { done: true });
assert.throws(() => agent.complete(stale), { code: 'AGENT_DELIVERABLE_INCOMPLETE' });
agent.recordObservation(stale, summary, health);
agent.complete(stale);

const missingResult = agent.create('Make an edit');
agent.acceptTurn(missingResult, { commands: [{ command: 'addTextLayer' }, { command: 'animateSelectedOpacity' }] });
agent.recordStep(missingResult, 'addTextLayer', verifiedHostResult(), true);
agent.recordObservation(missingResult, summary, health);
agent.acceptTurn(missingResult, { done: true });
assert.match(agent.completionBlocker(missingResult), /unexecuted/);
assert.throws(() => agent.complete(missingResult), { code: 'AGENT_DELIVERABLE_INCOMPLETE' });

const repaired = agent.create('Make an edit');
agent.acceptTurn(repaired, { commands: [{ command: 'addTextLayer' }] });
agent.recordStep(repaired, 'addTextLayer', { ok: false }, true);
agent.recordObservation(repaired, summary, health);
assert.match(agent.completionBlocker(repaired), /unresolved/);
agent.acceptTurn(repaired, { commands: [{ command: 'runScript' }] });
assert.throws(() => agent.recordStep(repaired, 'runScript', verifiedHostResult(), true, { repairsStep: 99 }), { code: 'AGENT_REPAIR_INVALID' });
agent.recordStep(repaired, 'runScript', verifiedHostResult(), true, { repairsStep: 0 });
assert.strictEqual(repaired.verifiedSteps[0].resolvedByStep, 1);
agent.recordObservation(repaired, summary, health);
agent.acceptTurn(repaired, { done: true });
agent.complete(repaired);
assert.strictEqual(repaired.status, 'COMPLETED');

const unhealthy = agent.create('Make an unrelated edit despite an existing missing-footage issue');
const baselineHealth = { ok: false, issueCount: 1, warningCount: 0, issues: [{ code: 'MISSING_FOOTAGE', item: 'old.mov' }], warnings: [] };
const issueObservation = agent.recordObservation(unhealthy, summary, baselineHealth);
assert.strictEqual(issueObservation.health.issues[0].code, 'MISSING_FOOTAGE', 'valid readback must retain existing health issues');
baselineHealth.issues[0].item = 'mutated.mov';
assert.strictEqual(issueObservation.health.issues[0].item, 'old.mov');
agent.acceptTurn(unhealthy, { commands: [{ command: 'addTextLayer' }] });
agent.recordStep(unhealthy, 'addTextLayer', verifiedHostResult(), true);
agent.recordObservation(unhealthy, summary, { ok: false, issues: [{ code: 'MISSING_FOOTAGE', item: 'old.mov' }], warnings: [] });
assert.strictEqual(agent.completionBlocker(unhealthy), '');
agent.recordObservation(unhealthy, summary, { ok: false, issueCount: 0, issues: [{ code: 'MISSING_FOOTAGE', item: 'new.mov' }], warnings: [] });
assert.match(agent.completionBlocker(unhealthy), /new or unexplained issues/);
agent.recordObservation(unhealthy, summary, { ok: false, issues: [], warnings: [] });
assert.match(agent.completionBlocker(unhealthy), /new or unexplained issues/);
assert.throws(() => agent.recordObservation(unhealthy, Object.assign({}, summary, { ok: false }), health), { code: 'AGENT_SUMMARY_INVALID' });

const bounded = agent.create('Bounded run');
assert.throws(() => agent.acceptTurn(bounded, { commands: new Array(5).fill({ command: 'summary' }) }), { code: 'AGENT_BATCH_LIMIT' });
assert.throws(() => agent.acceptTurn(bounded, { commands: [] }), { code: 'AGENT_EMPTY_TURN' });
const exhausted = agent.create('Bounded turns');
for (let turn = 0; turn < agent.MAX_TURNS; turn += 1) agent.acceptTurn(exhausted, { commands: [{ command: 'summary' }] });
assert.throws(() => agent.acceptTurn(exhausted, { done: true }), { code: 'AGENT_TURN_LIMIT' });
console.log('Agent session tests passed');
