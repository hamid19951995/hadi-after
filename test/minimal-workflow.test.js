const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function element(text) {
    const classes = new Set();
    const listeners = {};
    return {
        textContent: text || '', hidden: true, style: {}, attributes: {}, disabled: false,
        classList: {
            toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); },
            remove(name) { classes.delete(name); },
            contains(name) { return classes.has(name); }
        },
        setAttribute(name, value) { this.attributes[name] = value; },
        addEventListener(name, handler) { (listeners[name] || (listeners[name] = [])).push(handler); },
        dispatchEvent(event) { (listeners[event.type] || []).forEach(handler => handler(event)); },
        focus() { this.dispatchEvent({ type: 'focus' }); },
        querySelector() { return null; }
    };
}

const nodes = {};
['chatForm', 'promptInput', 'minimalTask', 'minimalResult', 'minimalTaskTitle', 'minimalTaskPercent', 'minimalProgressBar', 'minimalResultTitle', 'minimalResultMeta', 'minimalViewButton', 'minimalRenderButton'].forEach(id => { nodes[id] = element(); });
const steps = ['request', 'inspect', 'plan', 'execute', 'verify', 'save', 'complete'].map(element);
const document = element();
document.getElementById = id => nodes[id] || null;
document.querySelector = () => element();
document.querySelectorAll = selector => selector === '#minimalSteps li' ? steps : [];
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'minimal-ui.js'), 'utf8'), { document, window: { setTimeout }, Event: function (type) { this.type = type; } });
function phase(name, status, extra) {
    document.dispatchEvent({ type: 'aeboss:phase', detail: Object.assign({ phase: name, status, runId: 'run-1' }, extra) });
}
function complete(status, runId) {
    document.dispatchEvent({ type: 'aeboss:complete', detail: { status, runId: runId || 'run-1', message: 'Observed result' } });
}

nodes.chatForm.dispatchEvent({ type: 'submit' });
assert.strictEqual(nodes.minimalTask.hidden, true, 'rejected or empty submits must not start progress');
phase('request', 'received');
assert.strictEqual(nodes.minimalTask.hidden, false);
nodes.promptInput.focus();
assert.strictEqual(nodes.minimalTask.hidden, false, 'focus must not hide an active workflow');
phase('execute', 'running', { index: 0, total: 1 });
assert.strictEqual(steps[1].classList.contains('done'), false, 'later events cannot imply earlier phases succeeded');
assert.strictEqual(steps[3].classList.contains('done'), false);
const progress = nodes.minimalTaskPercent.textContent;
nodes.chatForm.dispatchEvent({ type: 'submit' });
assert.strictEqual(nodes.minimalTaskPercent.textContent, progress, 'busy submits cannot reset progress');
phase('inspect', 'verified', { runId: 'stale-run' });
assert.strictEqual(steps[1].classList.contains('done'), false, 'stale run events must be ignored');
complete('verified', 'stale-run');
assert.strictEqual(nodes.minimalResult.hidden, true);
phase('execute', 'verified');
phase('repair', 'verified');
assert.strictEqual(steps[3].classList.contains('done'), false, 'preparing a repair does not complete execution');
phase('save', 'skipped');
assert.strictEqual(steps[5].classList.contains('skipped'), true);
assert.strictEqual(steps[5].classList.contains('done'), false, 'read-only work must not claim to have saved a file');
phase('complete', 'verified');
assert.notStrictEqual(nodes.minimalTaskPercent.textContent, '100%', 'a phase announcement is not terminal completion');
complete('failed');
assert.notStrictEqual(nodes.minimalTaskPercent.textContent, '100%');
assert.strictEqual(nodes.minimalRenderButton.disabled, true);
phase('request', 'received', { runId: 'run-2' });
assert.strictEqual(steps[5].classList.contains('skipped'), false, 'new runs reset observed statuses');
phase('save', 'skipped', { runId: 'run-2' });
complete('verified', 'run-2');
assert.strictEqual(nodes.minimalTaskPercent.textContent, '100%');
assert.strictEqual(steps[5].classList.contains('done'), false, 'terminal success cannot fabricate a saved file');
assert.strictEqual(steps[1].classList.contains('done'), false, 'terminal success cannot fabricate unobserved phases');
assert.strictEqual(nodes.minimalRenderButton.disabled, false);
complete('failed', 'run-2');
assert.strictEqual(nodes.minimalTaskPercent.textContent, '100%', 'duplicate terminal events are ignored');
console.log('Minimal workflow behavioral tests passed');
