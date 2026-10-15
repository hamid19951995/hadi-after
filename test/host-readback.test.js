const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync(__dirname + '/../jsx/host.jsx', 'utf8');
const context = { File: function (path) { this.fsName = path; this.exists = path === 'C:/projects/final.aep' || path === 'C:/projects/empty.aep'; this.length = path === 'C:/projects/final.aep' ? 1024 : 0; }, RQItemStatus: { QUEUED: 3015, DONE: 3019 } };
vm.runInNewContext(source, context);

const failingHost = { File: context.File, app: {} };
Object.defineProperty(failingHost.app, 'project', { get() { throw new Error('simulated host read failure'); } });
vm.runInNewContext(source, failingHost);
const hostFailure = JSON.parse(failingHost.aeStudioCommand('summary', { requestId: 'host-error-test' }));
assert.strictEqual(hostFailure.ok, false);
assert.strictEqual(hostFailure.code, 'AE_HOST_EXCEPTION');
assert.strictEqual(hostFailure.message, 'simulated host read failure');
assert.strictEqual(hostFailure.requestId, 'host-error-test');

function composition(name, layerItems, values) {
    return Object.assign({ name, width: 1920, height: 1080, duration: 10, frameRate: 30, layers: layerItems.length, layerItems }, values || {});
}

const initialComp = composition('Main', [{ name: 'Title', type: 'TextLayer', text: 'Hello', keyframes: { position: 0, opacity: 0 } }]);
const before = { project: 'test.aep', activeItem: 'Main', activeType: 'Composition', compositions: [initialComp], selectedLayers: [{ name: 'Title' }], layerCount: 1, projectItems: [], renderQueueCount: 0, renderQueueItems: [] };
const afterText = Object.assign({}, before, { compositions: [composition('Main', [initialComp.layerItems[0], { name: 'Subtitle', type: 'TextLayer', text: 'World', keyframes: { position: 0, opacity: 0 } }])], layerCount: 2 });
const textReadback = context.aeStudioBuildMutationReadback('addTextLayer', { name: 'Subtitle', text: 'World' }, { ok: true }, before, afterText);
assert.strictEqual(textReadback.verified, true);

const afterAnimation = Object.assign({}, before, { compositions: [composition('Main', [{ name: 'Title', type: 'TextLayer', text: 'Hello', keyframes: { position: 2, opacity: 0 } }])] });
assert.strictEqual(context.aeStudioBuildMutationReadback('animateSelectedPosition', {}, { ok: true }, before, afterAnimation).verified, true);
assert.strictEqual(context.aeStudioBuildMutationReadback('animateSelectedPosition', {}, { ok: true }, before, before).verified, false);

const afterQueue = Object.assign({}, before, { renderQueueCount: 1, renderQueueItems: [{ composition: 'Main', status: 'QUEUED' }] });
assert.strictEqual(context.aeStudioBuildMutationReadback('queueComposition', {}, { ok: true }, before, afterQueue).verified, true);
const afterDuplicate = Object.assign({}, before, { compositions: [composition('Main', [initialComp.layerItems[0], initialComp.layerItems[0]])], layerCount: 2 });
assert.strictEqual(context.aeStudioBuildMutationReadback('duplicateSelectedLayer', {}, { ok: true }, before, afterDuplicate).verified, true);
assert.strictEqual(context.aeStudioBuildMutationReadback('duplicateSelectedLayer', {}, { ok: true }, before, before).verified, false);
const antiTheft = composition('Anti-Theft Awareness Teaser', [
    { name: 'Background', type: 'ADBE AV Layer' },
    { name: 'Warning Accent', type: 'ADBE Vector Layer' },
    { name: 'Title - Protect What Matters', type: 'TextLayer', text: 'PROTECT WHAT MATTERS', keyframes: { opacity: 2 } },
    { name: 'Message - Learn Secure Prevent', type: 'TextLayer', text: 'Learn the signs. Secure your space. Prevent theft.', keyframes: { opacity: 2 } },
    { name: 'CTA - Stay Alert', type: 'TextLayer', text: 'STAY ALERT  |  REPORT SUSPICIOUS ACTIVITY', keyframes: { opacity: 2 } }
], { width: 1920, height: 1080, duration: 15, frameRate: 30 });
const afterAntiTheft = Object.assign({}, before, { compositions: [initialComp, antiTheft] });
assert.strictEqual(context.aeStudioBuildMutationReadback('buildAntiTheftTeaser', {}, { ok: true }, before, afterAntiTheft).verified, true);
assert.strictEqual(context.aeStudioBuildMutationReadback('buildAntiTheftTeaser', {}, { ok: true }, before, before).verified, false);
assert.strictEqual(context.aeStudioBuildMutationReadback('runScript', { source: 'create layers', expectedState: { layers: [{ name: 'Subtitle', composition: 'Main', text: 'World' }] } }, { ok: true }, before, afterText).verified, true);
assert.strictEqual(context.aeStudioBuildMutationReadback('runScript', { source: 'create layers' }, { ok: true }, before, afterText).verified, false);
const savedSummary = Object.assign({}, afterText, { project: 'C:/projects/final.aep' });
assert.strictEqual(context.aeStudioBuildMutationReadback('saveProject', {}, { ok: true }, afterText, savedSummary).verified, true);
const missingFileSummary = Object.assign({}, savedSummary, { project: 'C:/projects/missing.aep' });
assert.strictEqual(context.aeStudioBuildMutationReadback('saveProject', {}, { ok: true }, afterText, missingFileSummary).verified, false);
assert.strictEqual(context.aeStudioVerifyExpectedState({ compositions: [{ name: 'Main', width: 1280 }] }, afterText), false);
assert.strictEqual(context.aeStudioBuildMutationReadback('addTextLayer', { name: 'Missing', text: 'Missing' }, { ok: true }, before, before).verified, false);

assert.strictEqual(context.aeStudioRenderStatus(context.RQItemStatus.DONE), 'DONE');
assert.strictEqual(context.aeStudioRenderStatus(context.RQItemStatus.QUEUED), 'QUEUED');
assert.strictEqual(context.aeStudioRenderStatus('NOT_DONE'), 'NOT_DONE');
const queuedItem = { index: 1, composition: 'Main', status: 'QUEUED', outputModules: [{ file: 'C:/renders/main.mov', exists: false, bytes: 0 }] };
const queuedSummary = Object.assign({}, before, { renderQueueCount: 1, renderQueueItems: [queuedItem] });
const renderedItem = Object.assign({}, queuedItem, { status: 'DONE', outputModules: [{ file: 'C:/renders/main.mov', exists: true, bytes: 4096 }] });
function renderReadback(items, prior) {
    return context.aeStudioBuildMutationReadback('renderQueue', {}, { ok: true }, prior || queuedSummary, Object.assign({}, before, { renderQueueCount: items.length, renderQueueItems: items }));
}
assert.strictEqual(renderReadback([renderedItem]).verified, true);
assert.strictEqual(renderReadback([Object.assign({}, renderedItem, { status: context.RQItemStatus.DONE })]).verified, true);
assert.strictEqual(renderReadback([Object.assign({}, renderedItem, { status: 'NOT_DONE' })]).verified, false);
assert.strictEqual(renderReadback([queuedItem]).verified, false, 'queuing is not rendering');
assert.strictEqual(renderReadback([Object.assign({}, renderedItem, { status: 'USER_STOPPED' })]).verified, false);
assert.strictEqual(renderReadback([Object.assign({}, renderedItem, { outputModules: [] })]).verified, false);
assert.strictEqual(renderReadback([Object.assign({}, renderedItem, { outputModules: [{ file: 'C:/renders/main.mov', exists: false, bytes: 4096 }] })]).verified, false);
assert.strictEqual(renderReadback([Object.assign({}, renderedItem, { outputModules: [{ file: 'C:/renders/main.mov', exists: true, bytes: 0 }] })]).verified, false);
assert.strictEqual(renderReadback([Object.assign({}, renderedItem, { outputModules: [{ file: 'C:/renders/wrong.mov', exists: true, bytes: 4096 }] })]).verified, false);
assert.strictEqual(renderReadback([Object.assign({}, renderedItem, { index: 2 })]).verified, false);
assert.strictEqual(renderReadback([Object.assign({}, renderedItem, { outputModulesTruncated: true })]).verified, false);
assert.strictEqual(renderReadback([renderedItem], Object.assign({}, queuedSummary, { renderQueueItems: [renderedItem] })).verified, false, 'an old completed render is not fresh render evidence');
const unqueued = { index: 2, composition: 'Unused', status: 'UNQUEUED', outputModules: [] };
assert.strictEqual(renderReadback([renderedItem, unqueued], Object.assign({}, queuedSummary, { renderQueueItems: [queuedItem, unqueued] })).verified, true, 'unselected queue items must not prevent verifying targeted outputs');
assert.strictEqual(context.aeStudioBuildMutationReadback('saveProject', {}, { ok: true }, afterText, Object.assign({}, savedSummary, { project: 'C:/projects/empty.aep' })).verified, false);
assert.strictEqual(context.aeStudioBuildMutationReadback('saveProject', { path: 'C:/projects/other.aep' }, { ok: true }, afterText, savedSummary).verified, false);
const summaryContext = { File: context.File, CompItem: function () {}, RQItemStatus: context.RQItemStatus, app: { project: { numItems: 0, activeItem: null, file: null, renderQueue: { numItems: 1, item() { return { status: 3019, comp: { name: 'Main' }, numOutputModules: 1, outputModule() { return { file: { fsName: 'C:/projects/final.aep' }, name: 'Lossless' }; } }; } } } } };
vm.runInNewContext(source, summaryContext);
const hostSummary = summaryContext.getProjectSummary();
assert.strictEqual(hostSummary.renderQueueItems[0].status, 'DONE');
assert.strictEqual(hostSummary.renderQueueItems[0].outputModules[0].exists, true);
assert.strictEqual(hostSummary.renderQueueItems[0].outputModules[0].bytes, 1024);
console.log('AE host semantic readback tests passed');
