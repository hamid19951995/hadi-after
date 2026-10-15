"use strict";

const assert = require("assert");

// Nodes: [{ id: "A", deps: ["B","C"], payload: { ... } }, ...]
function validateGraph(nodes) {
  assert(Array.isArray(nodes), "nodes must be an array");
  const errors = [];
  const idMap = new Map();
  nodes.forEach(n => {
    if (!n || typeof n.id !== "string" || !n.id) {
      errors.push({ type: "INVALID_NODE", node: n });
      return;
    }
    if (idMap.has(n.id)) errors.push({ type: "DUPLICATE_NODE", id: n.id });
    idMap.set(n.id, n);
  });
  // Missing deps
  nodes.forEach(n => {
    const deps = Array.isArray(n.deps) ? n.deps : [];
    deps.forEach(d => {
      if (!idMap.has(d)) errors.push({ type: "MISSING_DEPENDENCY", node: n.id, missing: d });
    });
  });
  // Cycle detection + topo sort
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const state = new Map();
  const topo = [];
  let cycleDetected = false;
  function dfs(u) {
    state.set(u, GRAY);
    const node = idMap.get(u);
    const deps = node && Array.isArray(node.deps) ? node.deps : [];
    for (let v of deps) {
      if (!idMap.has(v)) continue;
      const s = state.get(v) || WHITE;
      if (s === GRAY) {
        cycleDetected = true;
        errors.push({ type: "CYCLE_DETECTED", cycleStart: v, node: u });
        return;
      }
      if (s === WHITE) dfs(v);
      if (cycleDetected) return;
    }
    state.set(u, BLACK);
    topo.push(u);
  }
  for (let id of idMap.keys()) {
    if ((state.get(id) || WHITE) === WHITE) dfs(id);
    if (cycleDetected) break;
  }
  return { valid: errors.length === 0 && !cycleDetected, errors, topo: cycleDetected ? [] : topo.reverse() };
}

module.exports = { validateGraph };