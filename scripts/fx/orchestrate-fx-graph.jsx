#include "_io.jsxinc"
#include "apply-fx.jsxinc"

(function () {
    function fallbackWriteJSONAtomic(targetPath, obj) {
        var file = new File(String(targetPath));
        var folder = file.parent;
        if (folder && !folder.exists) folder.create();
        var tmp = new File(file.fsName + '.tmp');
        if (tmp.exists) tmp.remove();
        tmp.encoding = 'UTF-8';
        if (!tmp.open('w')) throw new Error('Failed to open fallback write: ' + file.fsName);
        tmp.write(JSON.stringify(obj, null, 2));
        tmp.close();
        if (tmp.exists && tmp.length > 0) {
            try { tmp.rename(file.name); } catch (e) { if (tmp.copy(file.fsName)) tmp.remove(); }
        }
        if (!file.exists || file.length <= 0) throw new Error('Fallback write verification failed: ' + file.fsName);
        return file;
    }

    function fallbackLog(msg) {
        try {
            var file = new File('C:/Temp/ae-boss-omega/diag.log');
            if (file.parent && !file.parent.exists) file.parent.create();
            file.encoding = 'UTF-8';
            if (file.open('a')) {
                file.write('[' + new Date().toISOString() + '] ' + String(msg) + '\n');
                file.close();
            }
        } catch (e) { }
        return true;
    }

    if (typeof FX_IO === 'undefined' || !FX_IO.writeJSONAtomic) {
        this.FX_IO = {
            writeJSONAtomic: fallbackWriteJSONAtomic,
            logStep: fallbackLog,
            resolveOutputDir: function () { return 'C:/Temp/ae-boss-omega'; }
        };
    }

    if (typeof FX_APPLY === 'undefined' || !FX_APPLY.applyEffectToLayer) {
        this.FX_APPLY = {
            applyEffectToLayer: function (layer, fxSpec) {
                var parade = layer.property('ADBE Effect Parade');
                var effectName = fxSpec && (fxSpec.matchName || fxSpec.name || fxSpec.fallbackMatchName || 'ADBE Fast Blur');
                var effect = parade.addProperty(effectName);
                if (fxSpec && fxSpec.customName) effect.name = fxSpec.customName;
                return { effect: effect, appliedMatchName: effectName };
            },
            applyParameters: function (effect, params) {
                if (!effect || !params || typeof params !== 'object') return { applied: 0, errors: [] };
                var errors = [];
                var applied = 0;
                var keys = Object.keys(params);
                for (var i = 0; i < keys.length; i++) {
                    var key = keys[i];
                    var value = params[key];
                    try {
                        var prop = null;
                        var count = effect.numProperties || 0;
                        for (var n = 1; n <= count; n++) {
                            var candidate = effect.property(n);
                            if (candidate && (candidate.name === key || candidate.matchName === key)) { prop = candidate; break; }
                        }
                        if (!prop) prop = effect.property(key);
                        if (!prop) { errors.push('Parameter not found: ' + key); continue; }
                        if (value && typeof value === 'object' && Array.isArray(value.keyframes)) {
                            for (var k = 0; k < value.keyframes.length; k++) {
                                var frame = value.keyframes[k];
                                prop.setValueAtTime(frame.time, frame.value);
                            }
                        } else {
                            prop.setValue(value);
                        }
                        applied++;
                    } catch (e) {
                        errors.push('Parameter error for ' + key + ': ' + String(e));
                    }
                }
                return { applied: applied, errors: errors };
            }
        };
    }

    function safeString(value) {
        try { return value === null || typeof value === 'undefined' ? '' : String(value); }
        catch (e) { return ''; }
    }

    function readJsonFile(pathText) {
        var file = new File(String(pathText || ''));
        if (!file.exists) return null;
        file.encoding = 'UTF-8';
        if (!file.open('r')) return null;
        var text = file.read();
        file.close();
        if (!text || text.length === 0) return null;
        try { return JSON.parse(text); } catch (e) { return null; }
    }

    function makeSampleGraph() {
        return {
            jobId: 'stage13-fx-graph',
            layers: [
                {
                    id: 'bg',
                    type: 'solid',
                    name: 'Background',
                    fxChains: [
                        {
                            id: 'bgBlur',
                            matchName: 'ADBE Fast Blur',
                            params: {
                                'ADBE FastBlur-0001': 18,
                                'ADBE FastBlur-0002': true
                            }
                        }
                    ]
                },
                {
                    id: 'fg',
                    type: 'solid',
                    name: 'Foreground',
                    fxChains: [
                        {
                            id: 'fgTint',
                            matchName: 'ADBE Tint',
                            params: {
                                'ADBE Tint-0001': [0, 255, 128, 255],
                                'ADBE Tint-0002': 0.7
                            }
                        }
                    ]
                },
                {
                    id: 'adj',
                    type: 'adjustment',
                    name: 'Adjustment',
                    fxChains: [
                        {
                            id: 'adjGlow',
                            matchName: 'ADBE Glow',
                            params: {
                                'ADBE Glow-0001': 18,
                                'ADBE Glow-0002': 1
                            }
                        }
                    ]
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
    }

    function resolveGraphInput() {
        try {
            var raw = $.getenv('AE_BOSS_FX_GRAPH_RAW');
            if (raw && raw.length > 0) return JSON.parse(raw);
        } catch (e) { }

        try {
            var envPath = $.getenv('AE_BOSS_FX_GRAPH_PATH');
            if (envPath && envPath.length > 0) {
                var parsed = readJsonFile(envPath);
                if (parsed) return parsed;
            }
        } catch (e) { }

        var defaultPath = 'C:/Temp/ae-boss-omega/fx-graph.json';
        var parsed = readJsonFile(defaultPath);
        if (parsed) return parsed;

        var sample = makeSampleGraph();
        try {
            var folder = new Folder('C:/Temp/ae-boss-omega');
            if (!folder.exists) folder.create();
            FX_IO.writeJSONAtomic(defaultPath, sample);
        } catch (e) { }
        return sample;
    }

    function createLayerForSpec(comp, layerSpec) {
        var type = String(layerSpec.type || 'solid').toLowerCase();
        if (type === 'null') {
            var nullLayer = comp.layers.addNull();
            nullLayer.name = layerSpec.name || 'Null Graph Layer';
            return nullLayer;
        }
        if (type === 'adjustment') {
            var adj = comp.layers.addSolid([1, 1, 1], layerSpec.name || 'Adjustment', 1920, 1080, 1);
            try { adj.adjustmentLayer = true; } catch (e) { }
            return adj;
        }
        return comp.layers.addSolid([1, 1, 1], layerSpec.name || 'Graph Layer', 1920, 1080, 1);
    }

    function findEffectProperty(effect, propertyRef) {
        if (!effect || !propertyRef) return null;
        var key = String(propertyRef || '');
        try {
            if (effect.property(key)) return effect.property(key);
        } catch (e) { }
        var count = effect.numProperties || 0;
        for (var i = 1; i <= count; i++) {
            try {
                var prop = effect.property(i);
                if (!prop) continue;
                if (safeString(prop.name) === key || safeString(prop.matchName) === key) return prop;
            } catch (e) { }
        }
        return null;
    }

    function resolveBindingRef(layerLookup, ref) {
        if (!ref) return null;
        var layerId = ref.layerId || ref.layer || ref.id || '';
        var effectId = ref.effectId || ref.effect || ref.chainId || '';
        var propName = ref.property || ref.param || ref.matchName || ref.name || '';
        var layerEntry = layerLookup[layerId];
        if (!layerEntry) return null;
        var layer = layerEntry.layer;
        var effect = null;
        if (effectId) {
            effect = layerEntry.effectMap[effectId];
        }
        if (!effect) {
            var parade = layer.property('ADBE Effect Parade');
            if (!parade) return null;
            var effectCandidates = layerEntry.spec.fxChains || [];
            for (var i = 0; i < effectCandidates.length; i++) {
                var chain = effectCandidates[i];
                var chainId = chain.id || (chain.name || chain.matchName);
                if (chainId === effectId || (chain.matchName === effectId)) {
                    try {
                        var byMatch = parade.property(chain.matchName || chain.name);
                        if (byMatch) effect = byMatch;
                    } catch (e) { }
                }
            }
        }
        if (!effect) return null;
        var prop = findEffectProperty(effect, propName);
        return { layer: layer, effect: effect, property: prop, layerId: layerId, effectId: effectId, propertyKey: propName };
    }

    function buildExpressionFromSource(sourceRef, layerLookup) {
        if (!sourceRef) return '';
        var sourceLayer = layerLookup[sourceRef.layerId];
        if (!sourceLayer || !sourceLayer.layer) return '';
        var sourceEffectId = sourceRef.effectId || '';
        var sourceLayerSpec = sourceLayer.spec;
        var sourceSpec = null;
        if (sourceLayerSpec && Array.isArray(sourceLayerSpec.fxChains)) {
            for (var i = 0; i < sourceLayerSpec.fxChains.length; i++) {
                var chain = sourceLayerSpec.fxChains[i];
                if ((chain.id || chain.name || chain.matchName) === sourceEffectId) { sourceSpec = chain; break; }
            }
        }
        var sourceEffectName = sourceSpec ? (sourceSpec.matchName || sourceSpec.name || sourceSpec.fallbackMatchName || sourceEffectId) : (sourceEffectId || '');
        var sourceProperty = sourceRef.property || '';
        var sourceLayerName = sourceLayerSpec && sourceLayerSpec.name ? sourceLayerSpec.name : (sourceLayer.layer.name || sourceRef.layerId);
        if (!sourceProperty) return 'thisComp.layer("' + sourceLayerName + '")';
        return 'thisComp.layer("' + sourceLayerName + '").effect("' + sourceEffectName + '")("' + sourceProperty + '")';
    }

    function applyBindingExpression(binding, layerLookup) {
        var targetRef = binding && binding.target ? binding.target : null;
        if (!targetRef) return false;
        var target = resolveBindingRef(layerLookup, targetRef);
        if (!target || !target.property) {
            throw new Error('Target property for binding not found: ' + JSON.stringify(binding.target));
        }
        var sourceRef = binding && binding.source ? binding.source : null;
        var expression = binding.expression;
        if (!expression && sourceRef) {
            expression = buildExpressionFromSource(sourceRef, layerLookup);
        }
        if (!expression || expression.length === 0) {
            expression = 'value';
        }
        target.property.expression = expression;
        return true;
    }

    function writeGraphReceipt(receipt) {
        var outputDir = $.getenv('AE_BOSS_OUTPUT_DIR');
        if (!outputDir || outputDir.length === 0) outputDir = 'C:/Temp/ae-boss-omega';
        var filePath = String(outputDir) + '/graph-orchestration-receipt.json';
        FX_IO.writeJSONAtomic(filePath, receipt);

        var copyBack = $.getenv('AE_BOSS_COPY_BACK_TO_REPO');
        if (copyBack && (String(copyBack).toLowerCase() === '1' || String(copyBack).toLowerCase() === 'true' || String(copyBack).toLowerCase() === 'yes')) {
            try {
                var repoRoot = $.getenv('AE_BOSS_REPO_ROOT');
                if (repoRoot && repoRoot.length > 0) {
                    var repoDir = String(repoRoot) + '/evidence/fx';
                    var folder = new Folder(repoDir);
                    if (!folder.exists) folder.create();
                    var repoTarget = repoDir + '/graph-orchestration-receipt.json';
                    var source = new File(filePath);
                    if ((new File(repoTarget)).exists) (new File(repoTarget)).remove();
                    if (source.exists) source.copy(repoTarget);
                }
            } catch (e) {
                FX_IO.logStep('COPY_BACK_GRAPH_FAIL ' + String(e));
            }
        }
        return filePath;
    }

    var receipt = {
        ok: false,
        jobId: 'stage13-fx-graph',
        startedAt: new Date().toISOString(),
        completedAt: null,
        layersCreated: [],
        effectApplications: [],
        bindingsApplied: [],
        warnings: [],
        errors: []
    };

    var comp = null;
    var layerLookup = {};

    try {
        app.beginUndoGroup('AE_BOSS_FX_GRAPH_ORCH');
        var graph = resolveGraphInput();
        receipt.jobId = graph.jobId || receipt.jobId;

        if (!app.project) app.newProject();
        comp = app.project.items.addComp('FX_GRAPH_TEST', 1920, 1080, 1, 8, 30);

        if (!graph.layers || !graph.layers.length) {
            throw new Error('Graph manifest contains no layers');
        }

        for (var i = 0; i < graph.layers.length; i++) {
            var layerSpec = graph.layers[i];
            var layer = createLayerForSpec(comp, layerSpec);
            layer.name = layerSpec.name || layer.name;
            layerLookup[layerSpec.id || layerSpec.name] = { layer: layer, spec: layerSpec, effectMap: {} };
            receipt.layersCreated.push({ id: layerSpec.id || layerSpec.name, type: layerSpec.type || 'solid', name: layer.name });

            var chains = Array.isArray(layerSpec.fxChains) ? layerSpec.fxChains : [];
            for (var c = 0; c < chains.length; c++) {
                var chain = chains[c];
                try {
                    var effectResult = FX_APPLY.applyEffectToLayer(layer, { matchName: chain.matchName || chain.name, customName: chain.id || chain.name, fallbackMatchName: chain.fallbackMatchName });
                    if (chain.params) {
                        var paramsResult = FX_APPLY.applyParameters(effectResult.effect, chain.params);
                        if (paramsResult && paramsResult.errors && paramsResult.errors.length > 0) {
                            receipt.warnings = receipt.warnings.concat(paramsResult.errors);
                        }
                    }
                    layerLookup[layerSpec.id || layerSpec.name].effectMap[chain.id || chain.name || chain.matchName] = effectResult.effect;
                    receipt.effectApplications.push({
                        layerId: layerSpec.id || layerSpec.name,
                        effectId: chain.id || chain.name || chain.matchName,
                        matchName: chain.matchName || chain.name || 'unknown',
                        status: 'applied'
                    });
                } catch (e) {
                    receipt.errors.push('apply-effect:' + (layerSpec.id || layerSpec.name) + ':' + (chain.matchName || chain.name || 'unknown') + ' :: ' + String(e));
                }
            }
        }

        if (Array.isArray(graph.bindings)) {
            for (var b = 0; b < graph.bindings.length; b++) {
                var binding = graph.bindings[b];
                try {
                    applyBindingExpression(binding, layerLookup);
                    receipt.bindingsApplied.push({
                        id: binding.id || ('binding-' + (b + 1)),
                        target: binding.target,
                        source: binding.source,
                        status: 'applied'
                    });
                } catch (e) {
                    receipt.errors.push('binding:' + (binding.id || ('binding-' + (b + 1))) + ' :: ' + String(e));
                }
            }
        }

        receipt.ok = receipt.errors.length === 0;
        app.endUndoGroup();
    } catch (e) {
        receipt.errors.push('fatal:' + String(e));
        try { app.endUndoGroup(); } catch (endErr) { }
    } finally {
        receipt.completedAt = new Date().toISOString();
        try { if (comp) comp.remove(); } catch (e) { }
        try {
            var outputPath = writeGraphReceipt(receipt);
            FX_IO.logStep('GRAPH_RECEIPT ' + outputPath + ' ok=' + String(receipt.ok));
        } catch (writeErr) {
            receipt.errors.push('save:' + String(writeErr));
        }
    }
})();
