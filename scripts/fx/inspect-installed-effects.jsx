// scripts/fx/inspect-installed-effects.jsx
// Inspect installed After Effects effects and write a JSON catalog to evidence/fx/effects-catalog.json

(function () {
    function safeString(s) { try { return String(s); } catch (e) { return ''; } }

    var scriptFile = new File($.fileName);
    var repoRoot = scriptFile.parent; // scripts/fx
    if (repoRoot) repoRoot = repoRoot.parent; // scripts
    if (repoRoot) repoRoot = repoRoot.parent; // repo root
    var outFolderPath = (repoRoot ? repoRoot.fsName : Folder.current.fsName) + '/evidence/fx';
    var outFolder = new Folder(outFolderPath);
    if (!outFolder.exists) outFolder.create();
    var outFile = new File(outFolder.fsName + '/effects-catalog.json');
    outFile.encoding = 'UTF-8';

    var catalog = {
        generatedAt: new Date().toISOString(),
        effects: [],
        failedEffects: []
    };

    // Helper to read property metadata
    function propInfo(prop) {
        var info = { name: safeString(prop.name), matchName: safeString(prop.matchName), index: prop.propertyIndex };
        try {
            // propertyValueType may exist
            if (typeof prop.propertyValueType !== 'undefined') info.valueType = String(prop.propertyValueType);
        } catch (e) { }
        try { if (typeof prop.minValue !== 'undefined') info.min = prop.minValue; } catch (e) { }
        try { if (typeof prop.maxValue !== 'undefined') info.max = prop.maxValue; } catch (e) { }
        try { info.isTimeVarying = !!prop.isTimeVarying; } catch (e) { }
        try { info.matchName = safeString(prop.matchName); } catch (e) { }
        return info;
    }

    // create a small composition and a solid to attach effects to
    var comp = null;
    var layer = null;
    try {
        if (!app.project) app.newProject();
        comp = app.project.items.addComp('FX_Catalog_Temp', 1920, 1080, 1, 1, 30);
        layer = comp.layers.addSolid([1, 1, 1], 'fx-catalog-temp-solid', 1920, 1080, 1);

        // app.effects is not always enumerable in the same way on every AE build; try a couple of ways
        var effectCollection = null;
        try { effectCollection = app.effects; } catch (e) { effectCollection = null; }

        if (!effectCollection) {
            // no effects collection available — try reading from app.plugins or a fallback and exit gracefully
            catalog.failedEffects.push({ reason: 'app.effects not available in this host' });
        } else {
            // Try to iterate; some hosts expose .length, others .numProperties
            var count = effectCollection.length || effectCollection.numProperties || 0;
            // In some APIs indexing starts at 1
            var startIndex = 0;
            if (count && effectCollection.hasOwnProperty('numProperties')) startIndex = 1;

            for (var i = startIndex; i < (startIndex + count); i++) {
                try {
                    var fxDef = effectCollection[i];
                    if (!fxDef) continue;
                    var matchName = safeString(fxDef.matchName || fxDef.matchName);
                    var displayName = safeString(fxDef.name || fxDef.displayName || matchName);
                    var category = safeString(fxDef.category || '');

                    // attempt to apply effect to the temp layer to introspect its properties
                    var applied = null;
                    try {
                        var effectsProp = layer.property('ADBE Effect Parade');
                        if (!effectsProp) throw new Error('Effect Parade not available on layer');
                        applied = effectsProp.addProperty(matchName);
                        if (!applied) throw new Error('Failed to apply ' + matchName);
                    } catch (errApply) {
                        // record but continue
                        catalog.failedEffects.push({ matchName: matchName, displayName: displayName, reason: 'apply_error', message: errApply.toString() });
                        continue;
                    }

                    var fxMeta = { matchName: matchName, displayName: displayName, category: category, properties: [] };

                    try {
                        var numProps = applied.numProperties || 0;
                        for (var p = 1; p <= numProps; p++) {
                            try {
                                var prop = applied.property(p);
                                if (!prop) continue;
                                fxMeta.properties.push(propInfo(prop));
                            } catch (eProp) {
                                // record but continue
                                fxMeta.properties.push({ name: 'UNKNOWN_PROP', error: String(eProp) });
                            }
                        }
                    } catch (eProps) {
                        // record property enumeration error
                        fxMeta.properties.push({ error: 'enumeration_failed', message: String(eProps) });
                    }

                    // remove the effect if possible
                    try {
                        if (applied && applied.canSetExpression === false) {
                            // some effect objects can't be removed via remove(); ignore
                        }
                        // try to remove by index
                        try { applied.remove(); } catch (e) { /* ignore */ }

                    } catch (eRem) { /* ignore removal errors */ }

                    catalog.effects.push(fxMeta);

                } catch (eFx) {
                    catalog.failedEffects.push({ reason: 'enumeration_error', message: String(eFx) });
                }
            }
        }

    } catch (e) {
        catalog.failedEffects.push({ reason: 'fatal', message: String(e) });
    } finally {
        // Clean up temporary layer and comp
        try {
            if (layer) {
                try { layer.remove(); } catch (er) { /* ignore */ }
            }
            if (comp) {
                try { comp.remove(); } catch (er) { /* ignore */ }
            }
        } catch (cleanErr) { /* ignore */ }

        // write file atomically
        try {
            var tmp = new File(outFolder.fsName + '/effects-catalog.json.tmp');
            if (tmp.exists) try { tmp.remove(); } catch (e) { }
            tmp.encoding = 'UTF-8';
            if (tmp.open('w')) {
                tmp.write(JSON.stringify(catalog, null, 2));
                tmp.close();
                // rename/move
                try { tmp.rename('effects-catalog.json'); } catch (rnErr) {
                    // fallback to writing directly
                    var direct = new File(outFile.fsName);
                    direct.encoding = 'UTF-8';
                    if (direct.open('w')) { direct.write(JSON.stringify(catalog, null, 2)); direct.close(); }
                }
            }
        } catch (writeErr) {
            // attempt direct write
            try {
                outFile.open('w'); outFile.write(JSON.stringify(catalog, null, 2)); outFile.close();
            } catch (finalErr) {
                // last resort: alert
                try { alert('Failed to write effects catalog: ' + finalErr); } catch (ignore) { }
            }
        }
    }
})();
