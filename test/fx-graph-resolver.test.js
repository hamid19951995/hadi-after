const assert = require('assert');
const { FxGraphResolver } = require('../src/engine/fx/fx_graph_resolver');

(function () {
  const manifest = {
    jobId: 'stage13-fx-graph',
    layers: [
      {
        id: 'bg',
        type: 'solid',
        name: 'Background',
        fxChains: [{ id: 'bgBlur', matchName: 'ADBE Fast Blur', params: { 'ADBE FastBlur-0001': 18 } }]
      },
      {
        id: 'fg',
        type: 'solid',
        name: 'Foreground',
        fxChains: [{ id: 'fgTint', matchName: 'ADBE Tint', params: { 'ADBE Tint-0001': [0, 255, 128, 255] } }]
      },
      {
        id: 'adj',
        type: 'adjustment',
        name: 'Adjustment',
        fxChains: [{ id: 'adjGlow', matchName: 'ADBE Glow', params: { 'ADBE Glow-0001': 16 } }]
      }
    ],
    bindings: [
      {
        id: 'bind-1',
        target: { layerId: 'fg', effectId: 'fgTint', property: 'ADBE Tint-0001' },
        source: { layerId: 'bg', effectId: 'bgBlur', property: 'ADBE FastBlur-0001' },
        expression: 'thisComp.layer("Background").effect("Fast Blur")("Blurriness")'
      }
    ]
  };

  const resolver = new FxGraphResolver(manifest);
  assert.strictEqual(resolver.errors.length, 0, 'valid manifest should pass');
  assert.strictEqual(resolver.valid, true, 'resolver should return valid on success');
  assert.ok(Array.isArray(resolver.executionPlan) && resolver.executionPlan.length >= 5, 'execution plan should include layers and bindings');

  const unknown = new FxGraphResolver({
    layers: [{ id: 'bg', fxChains: [{ id: 'blur', matchName: 'ADBE Fast Blur' }] }],
    bindings: [{ id: 'bad', target: { layerId: 'missing', effectId: 'x' }, source: { layerId: 'bg', effectId: 'blur' } }]
  });
  assert.strictEqual(unknown.valid, false, 'unknown layer reference should fail');
  assert.ok(unknown.errors.some(err => err.includes('Unknown target layer reference')), 'unknown layer error should be reported');

  const cycle = new FxGraphResolver({
    layers: [
      { id: 'a', fxChains: [{ id: 'fxA', matchName: 'ADBE Fast Blur' }] },
      { id: 'b', fxChains: [{ id: 'fxB', matchName: 'ADBE Tint' }] }
    ],
    bindings: [
      { id: 'c1', target: { layerId: 'a', effectId: 'fxA', property: 'x' }, source: { layerId: 'b', effectId: 'fxB', property: 'y' } },
      { id: 'c2', target: { layerId: 'b', effectId: 'fxB', property: 'y' }, source: { layerId: 'a', effectId: 'fxA', property: 'x' } }
    ]
  });
  assert.strictEqual(cycle.valid, false, 'cycle should fail');
  assert.ok(cycle.errors.some(err => err.includes('Cycle detected')), 'cycle error should be reported');

  console.log('FX graph resolver tests passed');
})();
