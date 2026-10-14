const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
const executor = source.slice(source.indexOf('    function executeRequest('), source.indexOf('    function generateMedia('));

function harness(options = {}) {
    const events = [];
    const calls = [];
    const finishes = [];
    const operations = [];
    const approvals = [];
    const verified = [];
    const context = {
        window: { confirm: (message) => { approvals.push(message); return true; }, AEPipe: { isMutation: () => true } },
        agentStopRequested: false,
        activeWorkflowHealth: null,
        offlineFirst: false,
        activeOperationId: null,
        activeAgentSession: null,
        normalizeCommand: (command) => command,
        validateRequest: (command) => ['summary', 'healthReport', 'createProject', 'runScript', 'saveProject', 'planWorkflow'].includes(command.command),
        publishWorkflowPhase: (phase, status) => events.push({ phase, status }),
        publishAgentEvent: () => {},
        recordOperation: (operation) => operations.push(operation),
        recordUsage: () => {},
        uiText: (english) => english,
        setStudioActivity: () => {},
        addMessage: () => {},
        finishMessage: (message) => finishes.push(message),
        updateStudioSummary: () => {},
        refreshStudioSummary: () => {},
        isValidHealthReport: (report) => !!report && Array.isArray(report.issues),
        messages: { querySelectorAll: () => [] },
        verifyCompletedPlan: (commands) => verified.push(commands),
        hostCall: (command, payload, callback) => {
            calls.push(command);
            if (options.hostCall) return options.hostCall(command, payload, callback);
            callback(success());
        },
        askProvider: (prompt, callback) => {
            if (options.askProvider) return options.askProvider(prompt, callback, context);
            throw new Error('Unexpected repair request');
        }
    };
    context.AEPipe = context.window.AEPipe;
    vm.createContext(context);
    vm.runInContext(executor, context);
    return { context, calls, finishes, events, operations, approvals, verified };
}

function success() {
    return { ok: true, aepipe: { state: 'SUCCESS', evidence: [{ type: 'verification', verified: true, hostReadback: { verified: true } }] }, hostReadback: { verified: true } };
}

for (const commands of [[], null, {}, [{ command: 'createProject' }, null], [{ command: 'createProject' }, { command: 'unsupported' }]]) {
    const run = harness();
    run.context.executeRequest({ commands }, false);
    assert.deepStrictEqual(run.calls, [], 'a malformed batch must fail before any host call');
    assert.strictEqual(run.verified.length, 0);
    assert.strictEqual(run.finishes.length, 1);
}

for (const result of [undefined, {}, { ok: true }, { ok: true, aepipe: { state: 'UNKNOWN' } }, { ok: false, status: 'UNKNOWN' }]) {
    const run = harness({ hostCall: (command, payload, callback) => callback(result) });
    run.context.executePlan([{ command: 'createProject' }, { command: 'saveProject' }], true, 0, 0);
    assert.deepStrictEqual(run.calls, ['createProject'], 'uncertain results must not advance or retry');
    assert.strictEqual(run.verified.length, 0);
    assert.match(run.finishes[0], /UNKNOWN/);
    assert.strictEqual(run.operations.find((operation) => operation.command === 'createProject').verified, false);
}

{
    const run = harness();
    delete run.context.window.AEPipe;
    run.context.executePlan([{ command: 'createProject' }], false, 0, 0);
    assert.deepStrictEqual(run.calls, []);
    assert.match(run.finishes[0], /governance/);
}

{
    const run = harness();
    run.context.executeRequest({ commands: [{ command: 'summary' }] }, false);
    assert.deepStrictEqual(run.approvals, []);
    assert(run.events.some((event) => event.phase === 'approval' && event.status === 'skipped'));
    assert(!run.events.some((event) => event.phase === 'approval' && event.status === 'approved'));
}

{
    const run = harness({
        hostCall: (command, payload, callback) => {
            if (command === 'createProject') return callback({ ok: false, message: 'Known failure' });
            callback(success());
        },
        askProvider: (prompt, callback) => callback({ commands: [{ command: 'runScript', payload: { source: 'repair' } }] })
    });
    run.context.executePlan([{ command: 'createProject' }, { command: 'saveProject' }], true, 0, 0);
    assert.deepStrictEqual(run.calls, ['createProject', 'runScript', 'saveProject']);
    assert.strictEqual(run.verified.length, 1);
    assert.strictEqual(run.verified[0].length, 2, 'the remainder of the original plan must be preserved');
    assert.strictEqual(run.events.filter((event) => event.phase === 'repair' && event.status === 'verified').length, 1);
}

{
    const run = harness({
        hostCall: (command, payload, callback) => callback({ ok: false, message: 'Known failure' }),
        askProvider: (prompt, callback, context) => {
            context.agentStopRequested = true;
            callback({ commands: [{ command: 'runScript' }] });
        }
    });
    run.context.executePlan([{ command: 'createProject' }, { command: 'saveProject' }], true, 0, 0);
    assert.deepStrictEqual(run.calls, ['createProject']);
    assert(!run.events.some((event) => event.phase === 'repair' && event.status === 'verified'));
}

{
    let repairCallback;
    const run = harness({
        hostCall: (command, payload, callback) => {
            if (command === 'createProject') return callback({ ok: false, message: 'Known failure' });
            if (command === 'runScript') { repairCallback = callback; return; }
            callback(success());
        },
        askProvider: (prompt, callback) => callback({ commands: [{ command: 'runScript' }] })
    });
    const agent = require('../runtime/agent-session');
    const session = agent.create('Inspect and adjust');
    agent.acceptTurn(session, { commands: [{ command: 'createProject' }, { command: 'saveProject' }] });
    run.context.AEBossAgentSession = agent;
    run.context.window.AEBossAgentSession = agent;
    run.context.executePlan([{ command: 'createProject' }, { command: 'saveProject' }], true, 0, 0, session);
    assert(!run.events.some((event) => event.phase === 'repair' && event.status === 'verified'), 'a proposed repair is not verified');
    assert.strictEqual(session.commandsIssued, 3, 'repair must consume command budget');
    repairCallback(success());
    assert.deepStrictEqual(run.calls, ['createProject', 'runScript', 'saveProject']);
    assert.strictEqual(session.verifiedSteps[0].resolvedByStep, 1);
    assert.strictEqual(session.verifiedSteps[1].verified, true);
    assert.strictEqual(session.verifiedSteps[2].verified, true);
}

{
    const run = harness({
        hostCall: (command, payload, callback) => callback({ ok: false, message: 'Known failure' }),
        askProvider: (prompt, callback) => callback({ commands: [{ command: 'runScript' }] })
    });
    const agent = require('../runtime/agent-session');
    const session = agent.create('Bounded repair');
    session.turns = agent.MAX_TURNS;
    run.context.AEBossAgentSession = agent;
    run.context.window.AEBossAgentSession = agent;
    run.context.executePlan([{ command: 'createProject' }], true, 0, 0, session);
    assert.deepStrictEqual(run.calls, ['createProject']);
    assert.match(run.finishes[0], /Repair stopped/);
}

{
    const baseline = { ok: true, project: 'scene.aep', compositions: [] };
    const health = { ok: true, issues: [], warnings: [] };
    const run = harness({
        hostCall: (command, payload, callback) => callback(command === 'summary' ? baseline : command === 'healthReport' ? health : success())
    });
    const agent = require('../runtime/agent-session');
    run.context.AEBossAgentSession = agent;
    run.context.window.AEBossAgentSession = agent;
    run.context.executeRequest({ commands: [{ command: 'createProject' }] }, true);
    assert.strictEqual(run.context.activeAgentSession.observations[0].stepCount, 0, 'initial health must be captured before mutations');
    assert.strictEqual(run.context.activeWorkflowHealth, health);
}

{
    const run = harness({ hostCall: (command, payload, callback) => callback({ ok: false, status: 'CANCELLED', message: 'User cancelled' }) });
    run.context.executePlan([{ command: 'createProject' }, { command: 'saveProject' }], true, 0, 0);
    assert.deepStrictEqual(run.calls, ['createProject']);
    assert.strictEqual(run.verified.length, 0);
    assert.match(run.finishes[0], /cancel/i);
}

{
    const run = harness({ hostCall: (command, payload, callback) => callback({ ok: false, message: 'Script failed' }) });
    run.context.offlineFirst = true;
    run.context.executePlan([{ command: 'runScript' }], false, 0, 0);
    assert.deepStrictEqual(run.calls, ['runScript']);
    assert.strictEqual(run.finishes.length, 1);
}

console.log('Workflow executor behavioral tests passed');


