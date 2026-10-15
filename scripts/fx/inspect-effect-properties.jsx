var fxScriptDir = '';
try {
    fxScriptDir = $.fileName ? $.fileName.replace(/[^\\/]+$/, '') : (Folder.current && Folder.current.fsName ? Folder.current.fsName + '/' : '');
} catch (e) {
    fxScriptDir = '';
}
var fxIoPath = fxScriptDir + '_io.jsxinc';
var fxIoFile = new File(fxIoPath);
if (!fxIoFile.exists) {
    var fxFallback = (Folder.current && Folder.current.fsName ? Folder.current.fsName + '/' : '') + '_io.jsxinc';
    fxIoFile = new File(fxFallback);
}
if (fxIoFile.exists) {
    $.evalFile(fxIoFile.fsName);
} else {
    throw new Error('Unable to locate _io.jsxinc for parameter introspection');
}

(function () {
    var FX_IO = (typeof FX_IO !== 'undefined' && FX_IO) || (typeof globalThis !== 'undefined' ? globalThis.FX_IO : null);
    if (!FX_IO) throw new Error('FX_IO is required for parameter introspection');

    function safeString(value) {
        try {
            if (value === null || typeof value === 'undefined') return '';
            return String(value);
        } catch (e) {
            return '';
        }
    }

    function safeNumber(value, fallback) {
        try {
            var n = Number(value);
            return Number.isFinite(n) ? n : fallback;
        } catch (e) {
            return fallback;
        }
    }

    function propertyTypeName(prop) {
        try {
            if (!prop || typeof prop.propertyType === 'undefined') return 'PROPERTY';
            var t = prop.propertyType;
            if (typeof t === 'string') return t;
            return safeString(t);
        } catch (e) {
            return 'PROPERTY';
        }
    }

    function propertyValueTypeName(prop) {
        try {
            if (!prop || typeof prop.propertyValueType === 'undefined') return 'Unknown';
            var t = prop.propertyValueType;
            if (typeof t === 'string') return t;
            return safeString(t);
        } catch (e) {
            return 'Unknown';
        }
    }

    function snapshotValue(prop) {
        try {
            if (!prop) return null;
            if (typeof prop.value !== 'undefined') {
                try {
                    var value = prop.value;
                    if (value && typeof value === 'object' && value.length !== undefined) return value;
                    return value;
                } catch (e) { }
            }
            if (typeof prop.defaultValue !== 'undefined') return prop.defaultValue;
            if (typeof prop.value !== 'undefined') return prop.value;
            return null;
        } catch (e) {
            return null;
        }
    }

    function collectPropertyTree(prop, depth, outList) {
        if (!prop) return;
        var entry = {
            name: safeString(prop.name),
            matchName: safeString(prop.matchName),
            propertyType: propertyTypeName(prop),
            propertyValueType: propertyValueTypeName(prop),
            index: (typeof prop.propertyIndex !== 'undefined') ? prop.propertyIndex : null,
            hasMin: !!(prop && prop.hasMin),
            minValue: null,
            hasMax: !!(prop && prop.hasMax),
            maxValue: null,
            defaultValue: null,
            currentValue: null,
            isGroup: !!(prop && prop.numProperties && prop.numProperties > 0),
            children: []
        };

        try {
            if (typeof prop.minimumValue !== 'undefined') entry.minValue = prop.minimumValue;
            if (typeof prop.maximumValue !== 'undefined') entry.maxValue = prop.maximumValue;
        } catch (e) { }

        try {
            if (typeof prop.value !== 'undefined' && prop.value !== null) entry.currentValue = prop.value;
        } catch (e) { }

        try {
            if (typeof prop.defaultValue !== 'undefined' && prop.defaultValue !== null) entry.defaultValue = prop.defaultValue;
            else if (entry.currentValue !== null) entry.defaultValue = entry.currentValue;
        } catch (e) { }

        if (prop && prop.numProperties && prop.numProperties > 0) {
            for (var i = 1; i <= prop.numProperties; i++) {
                try {
                    var child = prop.property(i);
                    if (child) collectPropertyTree(child, depth + 1, outList);
                } catch (eChild) { }
            }
        }

        outList.push(entry);
    }

    function buildParameterCatalog() {
        var result = {
            generatedAt: new Date().toISOString(),
            effects: [],
            failedEffects: []
        };

        var comp = null;
        var solid = null;
        var rootEffectArray = null;

        try {
            if (!app.project) app.newProject();
            comp = app.project.items.addComp('FX_Parameter_Inspect_Temp', 1920, 1080, 1, 1, 30);
            solid = comp.layers.addSolid([1, 1, 1], 'fx-param-temp-solid', 1920, 1080, 1);
            FX_IO.logStep('START_EFFECT_PROPERTY_INSPECTION script=' + $.fileName + ' time=' + new Date().toISOString());

            try { rootEffectArray = app.effects; } catch (e) { rootEffectArray = null; }
            if (!rootEffectArray) {
                result.failedEffects.push({ reason: 'app.effects unavailable' });
                return result;
            }

            var effectCount = rootEffectArray.length || 0;
            FX_IO.logStep('EFFECT_COUNT=' + effectCount);
            var parade = solid.property('ADBE Effect Parade');
            if (!parade) throw new Error('Effect Parade not available on temp solid');

            for (var i = 1; i <= effectCount; i++) {
                try {
                    var fxDef = rootEffectArray[i - 1];
                    if (!fxDef) continue;
                    var effectName = safeString(fxDef.matchName || fxDef.name || '');
                    if (!effectName) continue;

                    var existing = parade.property(effectName);
                    if (existing) {
                        try { existing.remove(); } catch (eRemove) { }
                    }

                    var applied = parade.addProperty(effectName);
                    if (!applied) continue;

                    var effectRecord = {
                        matchName: effectName,
                        displayName: safeString(fxDef.name || fxDef.displayName || effectName),
                        category: safeString(fxDef.category || ''),
                        properties: []
                    };

                    var propCount = applied.numProperties || 0;
                    for (var p = 1; p <= propCount; p++) {
                        try {
                            var prop = applied.property(p);
                            if (!prop) continue;
                            var collected = [];
                            collectPropertyTree(prop, 0, collected);
                            effectRecord.properties = effectRecord.properties.concat(collected);
                        } catch (eProp) {
                            effectRecord.properties.push({ name: 'PROPERTY_ERROR', message: String(eProp) });
                        }
                    }

                    try { applied.remove(); } catch (eRemove) { }
                    result.effects.push(effectRecord);
                } catch (eFx) {
                    result.failedEffects.push({ effectIndex: i, reason: String(eFx) });
                }
            }
        } catch (e) {
            result.failedEffects.push({ reason: 'fatal', message: String(e) });
        } finally {
            try { if (solid) solid.remove(); } catch (e) { }
            try { if (comp) comp.remove(); } catch (e) { }
            FX_IO.logStep('FINISH_EFFECT_PROPERTY_INSPECTION effects=' + result.effects.length + ' failed=' + result.failedEffects.length);
            try {
                var outputPath = FX_IO.writeArtifactWithFallback('effects-parameters-catalog.json', result);
                FX_IO.logStep('AFTER_WRITE_PARAMETERS_JSON ' + outputPath + ' bytes=' + (new File(outputPath).length || 0));
            } catch (writeErr) {
                FX_IO.logStep('WRITE_PARAMETERS_ERROR ' + String(writeErr));
            }
        }

        return result;
    }

    buildParameterCatalog();
})();

