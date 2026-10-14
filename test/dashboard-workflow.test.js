const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function element() {
    const listeners = {};
    return {
        textContent: '', children: [],
        addEventListener(name, handler) { (listeners[name] || (listeners[name] = [])).push(handler); },
        dispatchEvent(event) { (listeners[event.type] || []).forEach(handler => handler(event)); },
        insertBefore(child) { this.children.unshift(child); },
        removeChild(child) { this.children.splice(this.children.indexOf(child), 1); },
        get lastChild() { return this.children[this.children.length - 1]; },
        get firstChild() { return this.children[0]; }
    };
}
const nodes = { liveEvents: element(), liveReadbackOutput: element(), liveReadback: element() };
const document = element();
document.getElementById = id => nodes[id] || null;
document.createElement = () => element();
document.querySelectorAll = () => [];
let reads = 0;
const window = { AEBossAgentUI: {
    getRun() { return { id: 'old-run', status: 'interrupted', events: [{ sequence: 12, at: '2026-10-11T12:00:00Z', type: 'phase', detail: { phase: 'execute', status: 'running' } }], message: 'Reloaded before final verification' }; },
    readProject(callback) { reads += 1; callback({ summary: { ok: true, project: 'project.aep' }, health: { ok: true } }); }
} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'production-dashboard.js'), 'utf8'), { window, document, Date });
assert.strictEqual(reads, 0, 'recovery cannot replay host operations in preview');
assert.strictEqual(JSON.parse(nodes.liveReadbackOutput.textContent).status, 'interrupted');
assert.ok(nodes.liveEvents.children.some(item => item.textContent.includes('#12')));
assert.ok(nodes.liveEvents.children.some(item => item.textContent.includes('No operations were replayed')));
function emit(type, detail) { document.dispatchEvent({ type: 'aeboss:' + type, detail }); }
emit('phase', { phase: 'request', status: 'received', runId: 'new-run' });
const receipt = { request: 'Save my work', savedPath: 'project.aep', verified: true, steps: [{ command: 'saveProject', verified: true }] };
emit('complete', { runId: 'new-run', status: 'verified', message: 'File verified', receipt });
assert.deepStrictEqual(JSON.parse(nodes.liveReadbackOutput.textContent).receipt, receipt);
const before = nodes.liveReadbackOutput.textContent;
const count = nodes.liveEvents.children.length;
emit('complete', { runId: 'old-run', status: 'failed', message: 'Late stale callback' });
emit('step', { runId: 'old-run', status: 'failed', index: 0, total: 1 });
assert.strictEqual(nodes.liveReadbackOutput.textContent, before);
assert.strictEqual(nodes.liveEvents.children.length, count);
nodes.liveReadback.dispatchEvent({ type: 'click' });
assert.strictEqual(reads, 1);
assert.deepStrictEqual(JSON.parse(nodes.liveReadbackOutput.textContent).workflowReceipt, receipt, 'readback must preserve the final receipt');
console.log('Dashboard workflow behavioral tests passed');
