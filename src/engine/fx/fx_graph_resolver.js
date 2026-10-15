class FxGraphResolver {
  static normalizeText(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  static parseRef(ref) {
    if (!ref) return null;
    if (typeof ref === 'object' && !Array.isArray(ref)) {
      const layerId = FxGraphResolver.normalizeText(ref.layerId || ref.layer || ref.id || ref.layerRef || '');
      const effectId = FxGraphResolver.normalizeText(ref.effectId || ref.effect || ref.fxId || ref.chainId || '');
      const property = FxGraphResolver.normalizeText(ref.property || ref.param || ref.name || ref.matchName || '');
      return { layerId, effectId, property, raw: ref };
    }

    const text = String(ref).trim();
    const splitByColon = text.split(':').map(part => part.trim()).filter(Boolean);
    if (splitByColon.length >= 3) {
      return { layerId: splitByColon[0], effectId: splitByColon[1], property: splitByColon[2], raw: ref };
    }

    const splitByDot = text.split('.').map(part => part.trim()).filter(Boolean);
    if (splitByDot.length >= 3) {
      return { layerId: splitByDot[0], effectId: splitByDot[1], property: splitByDot[2], raw: ref };
    }

    return { layerId: text, effectId: '', property: '', raw: ref };
  }

  constructor(manifest = null) {
    this.manifest = null;
    this.errors = [];
    this.warnings = [];
    this.valid = false;
    this.executionPlan = [];
    if (manifest) this.resolve(manifest);
  }

  validateManifest(manifest) {
    const errors = [];
    const warnings = [];
    const input = manifest && typeof manifest === 'object' ? manifest : {};
    const layers = Array.isArray(input.layers) ? input.layers : [];
    if (!layers.length) errors.push('Manifest must contain at least one layer');

    const seenLayerIds = new Set();
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i] || {};
      const layerId = FxGraphResolver.normalizeText(layer.id || layer.name || `layer-${i + 1}`);
      if (!layerId) errors.push(`Layer at index ${i} is missing an id`);
      if (seenLayerIds.has(layerId)) errors.push(`Duplicate layer id: ${layerId}`);
      seenLayerIds.add(layerId);

      const chains = Array.isArray(layer.fxChains) ? layer.fxChains : (Array.isArray(layer.effects) ? layer.effects : []);
      for (let c = 0; c < chains.length; c++) {
        const chain = chains[c] || {};
        const matchName = FxGraphResolver.normalizeText(chain.matchName || chain.name || '');
        if (!matchName) errors.push(`Layer ${layerId} has an effect chain entry without a matchName/name`);
      }
    }

    const allBindings = Array.isArray(input.bindings) ? input.bindings : [];
    for (let i = 0; i < allBindings.length; i++) {
      const binding = allBindings[i] || {};
      const target = binding.target;
      const source = binding.source;
      if (!target || !source) errors.push(`Binding index ${i} is missing target/source`);
      if (binding.expression && typeof binding.expression !== 'string') errors.push(`Binding ${binding.id || i} has a non-string expression`);
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  resolve(manifest) {
    const input = manifest && typeof manifest === 'object' ? manifest : {};
    this.manifest = input;
    this.errors = [];
    this.warnings = [];

    const validation = this.validateManifest(input);
    this.errors.push(...validation.errors);
    this.warnings.push(...validation.warnings);

    const layers = Array.isArray(input.layers) ? input.layers : [];
    const layerIndex = new Map();
    const effectIndex = new Map();

    for (let i = 0; i < layers.length; i++) {
      const layerSpec = layers[i] || {};
      const layerId = FxGraphResolver.normalizeText(layerSpec.id || layerSpec.name || `layer-${i + 1}`);
      if (!layerId) continue;
      layerIndex.set(layerId, layerSpec);
      const chains = Array.isArray(layerSpec.fxChains) ? layerSpec.fxChains : (Array.isArray(layerSpec.effects) ? layerSpec.effects : []);
      for (let c = 0; c < chains.length; c++) {
        const chain = chains[c] || {};
        const effectId = FxGraphResolver.normalizeText(chain.id || `${layerId}-fx-${c + 1}`);
        const effectMatch = FxGraphResolver.normalizeText(chain.matchName || chain.name || '');
        effectIndex.set(`${layerId}.${effectId}`, {
          ...chain,
          layerId,
          effectId,
          matchName: effectMatch
        });
      }
    }

    const bindings = Array.isArray(input.bindings) ? input.bindings : [];
    const normalizedBindings = [];
    for (let i = 0; i < bindings.length; i++) {
      const binding = bindings[i] || {};
      const targetRef = FxGraphResolver.parseRef(binding.target);
      const sourceRef = FxGraphResolver.parseRef(binding.source);

      if (!targetRef || !sourceRef) {
        this.errors.push(`Binding ${binding.id || i} has invalid target/source`);
        continue;
      }

      if (!targetRef.layerId || !layerIndex.has(targetRef.layerId)) {
        this.errors.push(`Unknown target layer reference: ${String(binding.target)}`);
        continue;
      }

      if (!sourceRef.layerId || !layerIndex.has(sourceRef.layerId)) {
        this.errors.push(`Unknown source layer reference: ${String(binding.source)}`);
        continue;
      }

      // target effect validation is optional when effectId is not supplied; if supplied it must exist
      if (targetRef.effectId && !effectIndex.has(`${targetRef.layerId}.${targetRef.effectId}`)) {
        this.errors.push(`Unknown target effect reference: ${targetRef.layerId}.${targetRef.effectId}`);
      }
      if (sourceRef.effectId && !effectIndex.has(`${sourceRef.layerId}.${sourceRef.effectId}`)) {
        this.errors.push(`Unknown source effect reference: ${sourceRef.layerId}.${sourceRef.effectId}`);
      }

      normalizedBindings.push({
        ...binding,
        targetRef,
        sourceRef,
        targetKey: `${targetRef.layerId}.${targetRef.effectId || '*'}${targetRef.property ? '.' + targetRef.property : ''}`,
        sourceKey: `${sourceRef.layerId}.${sourceRef.effectId || '*'}${sourceRef.property ? '.' + sourceRef.property : ''}`
      });
    }

    const graph = new Map();
    for (const binding of normalizedBindings) {
      if (!binding.targetKey) continue;
      graph.set(binding.targetKey, binding.sourceKey);
    }

    const visiting = new Set();
    const visited = new Set();
    const cycleDetector = (node) => {
      if (visiting.has(node)) return true;
      if (visited.has(node)) return false;
      visiting.add(node);
      const next = graph.get(node);
      if (next && cycleDetector(next)) return true;
      visiting.delete(node);
      visited.add(node);
      return false;
    };

    for (const node of graph.keys()) {
      if (cycleDetector(node)) {
        this.errors.push(`Cycle detected in binding graph: ${node}`);
        break;
      }
    }

    const executionPlan = [];
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i] || {};
      const layerId = FxGraphResolver.normalizeText(layer.id || layer.name || `layer-${i + 1}`);
      executionPlan.push({ step: 'create-layer', layerId, layerType: layer.type || 'solid', name: layer.name || layerId });

      const chains = Array.isArray(layer.fxChains) ? layer.fxChains : (Array.isArray(layer.effects) ? layer.effects : []);
      for (let c = 0; c < chains.length; c++) {
        const chain = chains[c] || {};
        const effectId = FxGraphResolver.normalizeText(chain.id || `${layerId}-fx-${c + 1}`);
        executionPlan.push({ step: 'apply-effect', layerId, effectId, matchName: chain.matchName || chain.name || 'unknown', params: chain.params || {} });
      }
    }

    for (let i = 0; i < normalizedBindings.length; i++) {
      const binding = normalizedBindings[i];
      executionPlan.push({
        step: 'apply-binding',
        id: binding.id || `binding-${i + 1}`,
        target: binding.target,
        source: binding.source,
        expression: binding.expression || ''
      });
    }

    this.valid = this.errors.length === 0;
    this.executionPlan = executionPlan;
    return {
      manifest: input,
      valid: this.valid,
      errors: this.errors,
      warnings: this.warnings,
      executionPlan,
      bindings: normalizedBindings,
      layers: layers
    };
  }
}

module.exports = { FxGraphResolver };
