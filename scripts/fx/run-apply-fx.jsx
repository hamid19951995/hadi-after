#include "_io.jsxinc"
#include "apply-fx.jsxinc"

(function () {
    function fallbackWriteJSONAtomic(targetPath, obj) {
        var file = new File(String(targetPath));
        var folder = file.parent;
        if (folder && !folder.exists) folder.create();
        var tempPath = file.fsName + '.tmp';
        var tmp = new File(tempPath);
        if (tmp.exists) tmp.remove();
        tmp.encoding = 'UTF-8';
        if (!tmp.open('w')) throw new Error('Failed to open fallback temp file: ' + tempPath);
        tmp.write(JSON.stringify(obj, null, 2));
        tmp.close();
        if (tmp.exists && tmp.length > 0) {
            try { tmp.rename(file.name); } catch (e) { if (tmp.copy(file.fsName)) tmp.remove(); }
        }
        if (!file.exists || file.length <= 0) throw new Error('Fallback write failed: ' + file.fsName);
        return file;
    }

    if (typeof FX_IO === 'undefined' || !FX_IO.writeJSONAtomic) {
        this.FX_IO = {
            writeJSONAtomic: fallbackWriteJSONAtomic,
            logStep: function (msg) { try { var file = new File('C:/Temp/ae-boss-omega/diag.log'); if (!file.parent.exists) file.parent.create(); file.encoding = 'UTF-8'; file.open('a'); file.write('[' + new Date().toISOString() + '] ' + String(msg) + '\n'); file.close(); } catch (e) { } return true; },
            resolveOutputDir: function () { return 'C:/Temp/ae-boss-omega'; },
            resolveRepoRoot: function () { return null; }
        };
    }

    if (typeof FX_APPLY === 'undefined' || !FX_APPLY.applyEffectToLayer) {
        this.FX_APPLY = {
            applyEffectToLayer: function (layer, fxSpec) {
                var parade = layer.property('ADBE Effect Parade');
                var effectName = fxSpec.matchName || fxSpec.name || fxSpec.fallbackMatchName;
                var effect = parade.addProperty(effectName);
                if (fxSpec.customName) effect.name = fxSpec.customName;
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
                        var prop = effect.property(key);
                        if (!prop) {
                            var count = effect.numProperties || 0;
                            var found = null;
                            for (var n = 1; n <= count; n++) {
                                var p = effect.property(n);
                                if (p && (p.name === key || p.matchName === key)) { found = p; break; }
                            }
                            prop = found;
                        }
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

    function readText(pathText) {
        var path = String(pathText || '');
        var file = new File(path);
        if (!file.exists) return null;
        file.encoding = 'UTF-8';
        if (!file.open('r')) return null;
        var text = file.read();
        file.close();
        return text;
    }

    function loadJobFromFile(filePath) {
        var text = readText(filePath);
        if (!text || text.length === 0) return null;
        return JSON.parse(text);
    }

    function defaultJob() {
        return {
            jobId: 'fx-live-e2e',
            layerType: 'solid',
            effects: [
                {
                    matchName: 'ADBE Fast Blur',
                    customName: 'Live Fast Blur',
                    params: {
                        'ADBE FastBlur-0001': 18,
                        'ADBE FastBlur-0002': true
                    }
                },
                {
                    matchName: 'ADBE Hue Saturation',
                    customName: 'Live Hue Saturation',
                    params: {
                        'ADBE HueHue': 45,
                        'ADBE HueColorize': false
                    }
                }
            ]
        };
    }

    function resolveJob() {
        try {
            var rawEnv = $.getenv('AE_BOSS_FX_JOB_RAW');
            if (rawEnv && rawEnv.length > 0) return JSON.parse(rawEnv);
        } catch (e) { }

        try {
            var envPath = $.getenv('AE_BOSS_FX_JOB_PATH');
            if (envPath && envPath.length > 0) {
                var fromEnv = loadJobFromFile(envPath);
                if (fromEnv) return fromEnv;
            }
        } catch (e) { }

        var defaultPath = 'C:/Temp/ae-boss-omega/fx-job.json';
        var fromTemp = loadJobFromFile(defaultPath);
        if (fromTemp) return fromTemp;

        var sample = defaultJob();
        try {
            var folder = new Folder('C:/Temp/ae-boss-omega');
            if (!folder.exists) folder.create();
            FX_IO.writeJSONAtomic(defaultPath, sample);
        } catch (e) { }
        return sample;
    }

    function createTargetLayer(comp, layerType) {
        return comp.layers.addSolid([1, 1, 1], 'fx-layer', 1920, 1080, 1);
    }

    function writeReceipt(receipt) {
        var shellOutDir = $.getenv('AE_BOSS_OUTPUT_DIR');
        if (!shellOutDir || shellOutDir.length === 0) shellOutDir = 'C:/Temp/ae-boss-omega';
        var target = String(shellOutDir) + '/fx-receipt.json';
        FX_IO.writeJSONAtomic(target, receipt);

        var copyBack = $.getenv('AE_BOSS_COPY_BACK_TO_REPO');
        if (copyBack && (String(copyBack).toLowerCase() === '1' || String(copyBack).toLowerCase() === 'true')) {
            try {
                var repoRoot = $.getenv('AE_BOSS_REPO_ROOT');
                if (repoRoot && repoRoot.length > 0) {
                    var repoDir = String(repoRoot) + '/evidence/fx';
                    var folder = new Folder(repoDir);
                    if (!folder.exists) folder.create();
                    var repoTarget = repoDir + '/fx-receipt.json';
                    var source = new File(target);
                    if ((new File(repoTarget)).exists) (new File(repoTarget)).remove();
                    if (source.exists) source.copy(repoTarget);
                }
            } catch (e) {
                FX_IO.logStep('COPY_BACK_FAILED ' + String(e));
            }
        }

        return target;
    }

    var receipt = {
        ok: false,
        jobId: 'fx-live-e2e',
        startedAt: new Date().toISOString(),
        completedAt: null,
        effectsApplied: [],
        errors: [],
        warnings: [],
        layerType: 'solid'
    };

    var comp = null;
    var targetLayer = null;

    try {
        app.beginUndoGroup('AE_BOSS_APPLY_FX');
        var job = resolveJob();
        receipt.jobId = job.jobId || receipt.jobId;
        receipt.layerType = job.layerType || receipt.layerType;

        if (!app.project) app.newProject();
        comp = app.project.items.addComp('FX_LIVE_TEST', 1920, 1080, 1, 5, 30);
        targetLayer = createTargetLayer(comp, receipt.layerType);

        if (Array.isArray(job.effects)) {
            for (var i = 0; i < job.effects.length; i++) {
                var spec = job.effects[i];
                try {
                    var result = FX_APPLY.applyEffectToLayer(targetLayer, spec);
                    if (spec.params) {
                        var paramsResult = FX_APPLY.applyParameters(result.effect, spec.params);
                        if (paramsResult && paramsResult.errors && paramsResult.errors.length > 0) {
                            receipt.warnings = receipt.warnings.concat(paramsResult.errors);
                        }
                    }
                    receipt.effectsApplied.push({
                        matchName: spec.matchName || spec.name || 'unknown',
                        customName: spec.customName || null,
                        status: 'applied',
                        appliedMatchName: result.appliedMatchName || null
                    });
                } catch (e) {
                    receipt.errors.push('effect:' + (spec.matchName || spec.name || 'unknown') + ' :: ' + String(e));
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
        try { if (targetLayer) targetLayer.remove(); } catch (e) { }
        try { if (comp) comp.remove(); } catch (e) { }
        try {
            var outputPath = writeReceipt(receipt);
            FX_IO.logStep('FX_RECEIPT ' + outputPath + ' ok=' + String(receipt.ok));
        } catch (writeError) {
            receipt.errors.push('save:' + String(writeError));
            try {
                var fallbackPath = 'C:/Temp/ae-boss-omega/fx-receipt.json';
                var fallbackFile = new File(fallbackPath);
                if (fallbackFile.parent && !fallbackFile.parent.exists) fallbackFile.parent.create();
                fallbackWriteJSONAtomic(fallbackPath, receipt);
            } catch (finalFallback) { }
        }
    }
})();
