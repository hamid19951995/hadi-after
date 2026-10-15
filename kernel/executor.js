"use strict";

const { validateGraph } = require('./execution-graph');
const { isMutation } = require('./aepipe/aepipe-core');

// Execute a production graph respecting dependencies and dry-run/policy
// nodes: [{ id, command, payload, deps: [] }]
// adapter: AEAdapter-like with sendCommand(command,payload)
// opts: { dryRun: boolean, assetDownloader: AssetDownloader }
async function executeGraph(nodes, adapter, opts = {}) {
  const dryRun = !!opts.dryRun;
  const assetDownloader = opts.assetDownloader || null;
  const report = { ok: true, nodes: {}, order: [], logs: [] };
  const validation = validateGraph(nodes);
  if (!validation.valid) return { ok: false, errors: validation.errors };
  const topo = validation.topo;

  async function resolveAssetsForNode(node) {
    // detect asset keys: assetUrl (string) or assets (array of ids)
    if (!assetDownloader) return { ok: true };
    const payload = node.payload || {};
    const results = {};
    try {
      if (payload.assetUrl) {
        const id = payload.assetUrl;
        const r = await assetDownloader.getAssetById(id);
        if (r.status === 'STORED' || r.status === 'CACHED') {
          results.localPath = r.path;
        } else {
          return { ok: false, reason: 'ASSET_RESOLVE_FAILED', detail: r };
        }
      }
      if (Array.isArray(payload.assets) && payload.assets.length) {
        results.localAssets = [];
        for (const id of payload.assets) {
          const r = await assetDownloader.getAssetById(id);
          if (r.status === 'STORED' || r.status === 'CACHED') {
            results.localAssets.push({ id, path: r.path, meta: r.meta || null });
          } else {
            return { ok: false, reason: 'ASSET_RESOLVE_FAILED', detail: r, failedId: id };
          }
        }
      }
      return { ok: true, results };
    } catch (err) {
      return { ok: false, reason: 'ASSET_RESOLVE_EXCEPTION', detail: String(err && err.message || err) };
    }
  }

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

    // resolve any asset dependencies
    if (assetDownloader && node.payload && (node.payload.assetUrl || (Array.isArray(node.payload.assets) && node.payload.assets.length))) {
      const res = await resolveAssetsForNode(node);
      if (!res.ok) {
        report.nodes[id] = { ok: false, error: res.reason || 'ASSET_RESOLVE_ERROR', detail: res.detail || null };
        report.ok = false;
        report.logs.push({ node: id, event: 'asset-resolve-failed', detail: res });
        continue;
      }
      // inject resolved paths into payload copy to send to adapter
      node.payload = Object.assign({}, node.payload);
      if (res.results.localPath) node.payload.localPath = res.results.localPath;
      if (res.results.localAssets) node.payload.localAssets = res.results.localAssets;
    }

    // If dryRun and node is mutation -> simulate
    if (dryRun && isMutation(node.command || node.action)) {
      report.nodes[id] = { ok: true, simulated: true, note: 'DRY_RUN_SKIP_MUTATION' };
      continue;
    }
    try {
      const res = await adapter.sendCommand(node.command || node.action, node.payload || {});
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