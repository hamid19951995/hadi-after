const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
const intake = source.slice(source.indexOf('    function safeProviderPath('), source.indexOf('    function finishMessage('));
const governance = fs.readFileSync(path.join(__dirname, '../js/aepipe.js'), 'utf8');

function harness(options = {}) {
    const executions = [];
    const prompts = [];
    const finishes = [];
    const phases = [];
    const userMessages = [];
    const context = {
        window: { localStorage: { getItem: () => null, setItem: () => {} } },
        pending: !!options.pending,
        chatMode: options.chatMode || 'agent',
        offlineFirst: true,
        provider: { endpoint: '' },
        lastWorkflowPlan: { recommendedCommands: [{ command: 'saveProject' }] },
        input: { value: 'draft' },
        AEBossWorkflowRun: { create: (text) => ({ id: 'intake-test', request: text }) },
        publishWorkflowPhase: (phase, status) => phases.push({ phase, status }),
        addMessage: (message, role) => userMessages.push({ message, role }),
        syncSharedMemory: () => {},
        finishMessage: (message) => { finishes.push(message); context.pending = false; },
        uiText: (english) => english,
        recordUsage: () => {},
        recordOperation: () => {},
        learningGuide: () => 'Learning guide',
        executeRequest: (request, fromProvider, usage, text) => executions.push({ request, fromProvider, usage, text }),
        askProvider: (text, callback) => {
            prompts.push(text);
            callback(options.response || { reply: 'Please clarify your scene.' }, { total_tokens: 5 });
        },
        complexProductionTestPlan: () => { throw new Error('Unexpected canned production plan'); },
        capabilityTestPlan: () => { throw new Error('Unexpected capability test'); }
    };
    vm.createContext(context);
    vm.runInContext(governance, context);
    context.AEPipe = context.window.AEPipe;
    vm.runInContext(intake, context);
    return { context, executions, prompts, finishes, phases, userMessages };
}

for (const text of ['Create a cinematic teaser', 'Create an audio teaser about dolphins', 'execute the plan', 'Add a text layer "Hello"']) {
    const run = harness({ chatMode: 'ask', response: { reply: 'I propose this action.', commands: [{ command: 'saveProject' }] } });
    run.context.send(text);
    assert.deepStrictEqual(run.executions, [], 'Ask mode must never execute even when provider returns commands');
    assert.strictEqual(run.finishes.length, 1);
}

{
    const text = 'Create a cinematic teaser about dolphins at sunset';
    const response = { reply: 'I will construct your dolphin scene.', commands: [{ command: 'createProject', payload: { name: 'Dolphins' } }] };
    const run = harness({ response });
    run.context.send(text);
    assert.deepStrictEqual(run.prompts, [text], 'the original request must reach the planner unchanged');
    assert.strictEqual(run.executions.length, 1);
    assert.strictEqual(run.executions[0].request, response, 'reply text must not suppress executable provider commands');
    assert.strictEqual(run.executions[0].text, text);
    assert.strictEqual(run.executions[0].fromProvider, true);
    assert.deepStrictEqual(run.finishes, []);
}

for (const text of ['Create a motion graphic about ocean currents', 'Create a dramatic teaser about mountain climbers']) {
    const run = harness();
    const parsed = run.context.parseRequest(text);
    assert(!parsed || !parsed.commands, 'general creative requests must not be replaced by canned production batches');
    assert(!parsed || !['buildAntiTheftTeaser', 'buildAudioTeaser'].includes(parsed.command));
    run.context.send(text);
    assert.deepStrictEqual(run.prompts, [text]);
    assert.deepStrictEqual(run.executions, [], 'a clarification reply must not manufacture a successful production');
}

{
    const run = harness();
    for (const request of [null, {}, { command: 'unsupportedMutation', payload: {} }, { command: 'summary', payload: [] }, { command: 'summary', payload: 'invalid' }, { command: 'runScript', payload: { source: 'app.project.items.addFolder("Unverified")' } }]) {
        assert.strictEqual(run.context.validateRequest(request), false, 'unsupported commands and malformed payloads must be rejected');
    }
    assert.strictEqual(run.context.validateRequest({ command: 'summary', payload: {} }), true);
    assert.strictEqual(run.context.validateRequest({ command: 'saveProject', payload: {} }), true);
}

for (const options of [{ text: '' }, { text: 'Create a teaser', pending: true }]) {
    const run = harness(options);
    run.context.send(options.text);
    assert.deepStrictEqual(run.executions, []);
    assert.deepStrictEqual(run.prompts, []);
    assert.deepStrictEqual(run.phases, [], 'ignored submissions must not start workflow progress');
    assert.deepStrictEqual(run.userMessages, []);
    assert.strictEqual(run.context.input.value, 'draft');
}

console.log('Workflow intake behavioral tests passed');
