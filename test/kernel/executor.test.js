const assert = require('assert');
const { executeGraph } = require('../../kernel/executor');
const { AEAdapter, MockHost } = require('../../runtime/ae-adapter');

(async function () {
  // simple graph: A -> B
  const nodes = [ { id: 'A', deps: [], command: 'createProject', payload: { name: 'Main' } }, { id: 'B', deps: ['A'], command: 'addTextLayer', payload: { text: 'Hi' } } ];
  const host = new MockHost({ responses: [ { ok: true, aepipe: { state: 'SUCCESS' }, hostReadback: { verified: true } }, { ok: true, aepipe: { state: 'SUCCESS' }, hostReadback: { verified: true } } ] });
  const adapter = new AEAdapter(host, { retryOnTransport: 0 });
  const results = await executeGraph(nodes, adapter, { dryRun: false });
  assert.strictEqual(results.nodes['A'].ok, true);
  assert.strictEqual(results.nodes['B'].ok, true);

  // dry run should not call host
  const host2 = new MockHost({ responses: [ { ok: true } ] });
  const adapter2 = new AEAdapter(host2, { retryOnTransport: 0 });
  const dry = await executeGraph(nodes, adapter2, { dryRun: true });
  assert.strictEqual(dry.nodes['A'].simulated, true);
  assert.strictEqual(dry.nodes['B'].simulated, true);

  // dependency failure: simulate A fails
  const host3 = new MockHost({ responses: [ { ok: false, aepipe: { state: 'FAILED' } } ] });
  const adapter3 = new AEAdapter(host3, { retryOnTransport: 0 });
  const res3 = await executeGraph([ nodes[0], nodes[1] ], adapter3, { dryRun: false });
  assert.strictEqual(res3.nodes['A'].ok, false);
  assert.strictEqual(res3.nodes['B'].ok, false);

  // Test dry-run skips mutation
  const nodes2 = [
    { id: 'n1', command: 'summary', payload: {}, deps: [] },
    { id: 'n2', command: 'createProject', payload: { name: 'P' }, deps: ['n1'] }
  ];
  const host4 = new MockHost({ responses: [ { ok: true, aepipe: { state: 'SUCCESS' }, hostReadback: {} } ] });
  const adapter4 = new AEAdapter(host4, { retryOnTransport: 0 });
  const report = await executeGraph(nodes2, adapter4, { dryRun: true });
  assert.strictEqual(report.nodes['n1'].ok, true);
  assert.strictEqual(report.nodes['n2'].simulated, true);
  // Ensure host got only one call for summary
  assert.strictEqual(host4.callCount, 1);

  // Test execution order and dependency enforcement
  const host5 = new MockHost({ responses: [ { ok: true, aepipe: { state: 'SUCCESS' } }, { ok: true, aepipe: { state: 'SUCCESS' } } ] });
  const adapter5 = new AEAdapter(host5, { retryOnTransport: 0 });
  const report2 = await executeGraph(nodes2, adapter5, { dryRun: false });
  assert.strictEqual(report2.ok, true);
  assert.strictEqual(host5.callCount, 2);
  assert.deepStrictEqual(report2.order, ['n1', 'n2']);

  console.log('executor tests passed');
})();