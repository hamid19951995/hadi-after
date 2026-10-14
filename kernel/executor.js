"use strict";

const { validateGraph } = require('./execution-graph');
const { isMutation } = require('./aepipe/aepipe-core');

// Execute a production graph respecting dependencies and dry-run/policy
// nodes: [{ id, command, payload, deps: [] }]
// adapter: AEAdapter-like with sendCommand(command,payload)
// opts: { dryRun: boolean }
async function executeGraph(nodes, adapter, opts = {}) {
  const dryRun = !!opts.dryRun;
  const report = { ok: true, nodes: {}, order: [] };
  const validation = validateGraph(nodes);
  if (!validation.valid) return { ok: false, errors: validation.errors };
  const topo = validation.topo;
  for (const id of topo) {
    const node = nodes.find(n => n.id === id);
    report.order.push(id);
    if (!node) {
      report.ok = false;
      report.nodes[id] = { ok: false, error: 'NODE_MISSING' };
      continue;
    }
    // check deps success
    const deps = (node.deps || []);
    let depsOk = true;
    for (const d of deps) {
      if (!report.nodes[d] || report.nodes[d].ok !== true) depsOk = false;
    }
    if (!depsOk) {
      report.ok = false;
      report.nodes[id] = { ok: false, error: 'DEPENDENCY_FAILED' };
      continue;
    }
    // If dryRun and node is mutation -> simulate
    if (dryRun && isMutation(node.command)) {
      report.nodes[id] = { ok: true, simulated: true, note: 'DRY_RUN_SKIP_MUTATION' };
      continue;
    }
    try {
      const res = await adapter.sendCommand(node.command, node.payload || {});
      report.nodes[id] = { ok: !!res && res.ok === true, response: res };
      if (!report.nodes[id].ok) report.ok = false;
    } catch (err) {
      report.nodes[id] = { ok: false, error: err && err.message || String(err) };
      report.ok = false;
    }
  }
  return report;
}

module.exports = { executeGraph };