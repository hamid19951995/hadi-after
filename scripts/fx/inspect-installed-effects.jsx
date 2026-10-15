(function () {
    var FX_IO = (typeof FX_IO !== 'undefined' && FX_IO) || (function () {
        var config = {
            repoEvidenceDir: 'evidence/fx',
            tempRoot: 'C:/Temp/ae-boss-omega',
            fallbackRoot: 'C:/Temp/ae-boss-omega',
            copyBackToRepo: true,
            preferRepoWrite: false,
            debug: true
        };

        function resolveRepoRootFromScript(scriptFile) {
            var candidate = null;
            try { candidate = scriptFile && scriptFile.parent ? scriptFile.parent : Folder.current; } catch (e) { candidate = Folder.current; }
            var seen = {};
            while (candidate && !seen[candidate.fsName]) {
                seen[candidate.fsName] = true;
                if (candidate && candidate.name === 'scripts' && candidate.parent) return candidate.parent;
                if (candidate && candidate.name === 'fx' && candidate.parent && candidate.parent.name === 'scripts' && candidate.parent.parent) return candidate.parent.parent;
                candidate = candidate.parent;
            }
            return Folder.current;
        }

        function getRepoEvidenceDir() {
            try { return resolveRepoRootFromScript(new File($.fileName)).fsName + '/' + config.repoEvidenceDir; } catch (e) { return config.fallbackRoot; }
        }

        function getTempEvidenceDir() {
            try { if (Folder.temp && Folder.temp.fsName) return Folder.temp.fsName + '/ae-boss-omega'; } catch (e) { }
            return config.tempRoot;
        }

        function getLogTargets() {
            return [getRepoEvidenceDir() + '/diag.log', getTempEvidenceDir() + '/diag.log', config.fallbackRoot + '/diag.log'];
        }

        function ensureFolderForPath(filePath) {
            try {
                var normalized = String(filePath).replace(/\\/g, '/');
                var idx = normalized.lastIndexOf('/');
                if (idx <= 0) return true;
                var folder = new Folder(normalized.substring(0, idx));
                if (!folder.exists) folder.create();
                return folder.exists;
            } catch (e) { return false; }
        }

        function appendLogLine(filePath, line) {
            try {
                if (!ensureFolderForPath(filePath)) return false;
                var logFile = new File(String(filePath));
                logFile.encoding = 'UTF-8';
                if (!logFile.open('a')) return false;
                logFile.write(String(line));
                if (typeof logFile.flush !== 'undefined') { try { logFile.flush(); } catch (e) { } }
                logFile.close();
                var verify = new File(String(filePath));
                verify.encoding = 'UTF-8';
                if (verify.open('r')) {
                    var content = verify.read();
                    verify.close();
                    if (content && content.length > 0) return true;
                }
                return false;
            } catch (e) { return false; }
        }

        function tryCopyFile(sourcePath, destPath) {
            try {
                if (!ensureFolderForPath(destPath)) return false;
                var source = new File(String(sourcePath));
                var dest = new File(String(destPath));
                if (dest.exists) { try { dest.remove(); } catch (e) { } }
                return !!source.copy(dest.fsName);
            } catch (e) { return false; }
        }

        function writeTextAtomic(targetPath, text) {
            var targetFile = new File(String(targetPath));
            var parentFolder = targetFile.parent;
            if (parentFolder && !parentFolder.exists) parentFolder.create();
            var tmpPath = targetFile.fsName + '.tmp';
            var tmpFile = new File(tmpPath);
            try { if (tmpFile.exists) tmpFile.remove(); } catch (e) { }
            tmpFile.encoding = 'UTF-8';
            if (!tmpFile.open('w')) throw new Error('Cannot open temp file for write: ' + tmpPath);
            tmpFile.write(String(text));
            if (typeof tmpFile.flush !== 'undefined') { try { tmpFile.flush(); } catch (e) { } }
            tmpFile.close();
            try {
                var verify = new File(tmpPath); verify.encoding = 'UTF-8';
                if (verify.open('r')) {
                    var content = verify.read(); verify.close();
                    if (!content || content.length === 0) {
                        if (tmpFile.open('w')) {
                            tmpFile.write(String(text));
                            if (typeof tmpFile.flush !== 'undefined') { try { tmpFile.flush(); } catch (e) { } }
                            tmpFile.close();
                        }
                    }
                }
            } catch (e) { }
            try { tmpFile.rename(targetFile.name); } catch (e) {
                try { if (tmpFile.copy(targetFile.fsName)) tmpFile.remove(); } catch (e2) { throw new Error('Rename/copy fallback failed: ' + String(e2)); }
            }
            var finalFile = new File(targetFile.fsName);
            if (!finalFile.exists || finalFile.length <= 0) throw new Error('Atomic write verification failed for: ' + targetFile.fsName);
            return finalFile;
        }

        function writeJSONAtomic(targetPath, obj) { return writeTextAtomic(String(targetPath), JSON.stringify(obj, null, 2)); }

        function writeArtifactWithFallback(fileName, obj) {
            var repoTarget = getRepoEvidenceDir() + '/' + fileName;
            var tempTarget = getTempEvidenceDir() + '/' + fileName;
            var fallbackTarget = config.fallbackRoot + '/' + fileName;
            var candidates = [repoTarget, tempTarget, fallbackTarget];
            var written = null;
            for (var i = 0; i < candidates.length; i++) {
                var candidate = candidates[i];
                try {
                    writeJSONAtomic(candidate, obj);
                    written = candidate;
                    if (candidate !== repoTarget && config.copyBackToRepo) { tryCopyFile(candidate, repoTarget); }
                    break;
                } catch (e) {
                    if (config.debug) { try { logStep('WRITE_FAIL path=' + candidate + ' error=' + String(e)); } catch (ignore) { } }
                }
            }
            if (!written) throw new Error('Unable to write any output target for: ' + fileName);
            return written;
        }

        function logStep(msg) {
            var line = '[' + new Date().toISOString() + '] ' + String(msg) + '\n';
            var targets = getLogTargets();
            for (var i = 0; i < targets.length; i++) {
                var target = targets[i];
                if (!target) continue;
                try {
                    if (appendLogLine(target, line)) return true;
                } catch (e) { }
            }
            throw new Error('Unable to write any log target for message: ' + String(msg));
        }

        return {
            config: config,
            resolveRepoRootFromScript: resolveRepoRootFromScript,
            getLogTargets: getLogTargets,
            getRepoEvidenceDir: getRepoEvidenceDir,
            getTempEvidenceDir: getTempEvidenceDir,
            writeTextAtomic: writeTextAtomic,
            writeJSONAtomic: writeJSONAtomic,
            writeArtifactWithFallback: writeArtifactWithFallback,
            logStep: logStep
        };
    })();

    if (typeof globalThis !== 'undefined') globalThis.FX_IO = FX_IO;
    if (typeof $ !== 'undefined') $._fx_io = FX_IO;

    function safeString(value) { try { return String(value); } catch (e) { return ''; } }

    var scriptFile = new File($.fileName);
    var repoRoot = FX_IO.resolveRepoRootFromScript(scriptFile);
    var repoEvidenceDir = repoRoot.fsName + '/evidence/fx';
    var repoFolder = new Folder(repoEvidenceDir);
    if (!repoFolder.exists) repoFolder.create();

    var repoDiag = repoEvidenceDir + '/diag.log';
    var repoCanWrite = 'unknown';
    try { repoCanWrite = repoFolder.canWrite ? 'true' : 'false'; } catch (e) { }

    FX_IO.logStep('START script=' + $.fileName + ' time=' + new Date().toISOString());
    FX_IO.logStep('Folder.current=' + Folder.current.fsName);
    FX_IO.logStep('Folder.temp=' + (Folder.temp ? Folder.temp.fsName : 'unavailable'));
    FX_IO.logStep('repoTarget=' + repoDiag + ' folderExists=' + repoFolder.exists + ' canWrite=' + repoCanWrite);

    var catalog = { generatedAt: new Date().toISOString(), effects: [], failedEffects: [] };
    var comp = null;
    var layer = null;
    try {
        if (!app.project) app.newProject();
        comp = app.project.items.addComp('FX_Catalog_Temp', 1920, 1080, 1, 1, 30);
        FX_IO.logStep('AFTER_CREATE_COMP ' + (comp ? comp.name : 'none'));
        layer = comp.layers.addSolid([1, 1, 1], 'fx-catalog-temp-solid', 1920, 1080, 1);
        FX_IO.logStep('AFTER_CREATE_SOLID ' + (layer ? layer.name : 'none'));

        var effectCollection = null;
        try { effectCollection = app.effects; } catch (e) { effectCollection = null; }
        if (!effectCollection) {
            catalog.failedEffects.push({ reason: 'app.effects not available in this host' });
        } else {
            var count = effectCollection.length || effectCollection.numProperties || 0;
            FX_IO.logStep('AFTER_ENUM_EFFECTS_COUNT ' + count);
            var startIndex = 0;
            if (count && effectCollection.hasOwnProperty('numProperties')) startIndex = 1;
            for (var i = startIndex; i < (startIndex + count); i++) {
                try {
                    var fxDef = effectCollection[i];
                    if (!fxDef) continue;
                    var matchName = safeString(fxDef.matchName || fxDef.name || '');
                    var displayName = safeString(fxDef.name || fxDef.displayName || matchName);
                    var category = safeString(fxDef.category || '');
                    var effectsProp = layer.property('ADBE Effect Parade');
                    if (!effectsProp) throw new Error('Effect Parade not available on layer');
                    var applied = effectsProp.addProperty(matchName);
                    if (!applied) throw new Error('Failed to apply ' + matchName);
                    var fxMeta = { matchName: matchName, displayName: displayName, category: category, properties: [] };
                    try {
                        var numProps = applied.numProperties || 0;
                        for (var p = 1; p <= numProps; p++) {
                            try {
                                var prop = applied.property(p);
                                if (!prop) continue;
                                fxMeta.properties.push({ name: safeString(prop.name), matchName: safeString(prop.matchName), index: prop.propertyIndex });
                            } catch (eProp) {
                                fxMeta.properties.push({ name: 'UNKNOWN_PROP', error: String(eProp) });
                            }
                        }
                    } catch (eProps) {
                        fxMeta.properties.push({ error: 'enumeration_failed', message: String(eProps) });
                    }
                    try { applied.remove(); } catch (eRemove) { }
                    catalog.effects.push(fxMeta);
                    if (catalog.effects.length > 0 && catalog.effects.length % 25 === 0) {
                        FX_IO.logStep('EVERY_N_EFFECTS ' + catalog.effects.length);
                    }
                } catch (eFx) {
                    catalog.failedEffects.push({ reason: 'enumeration_error', message: String(eFx) });
                }
            }
        }
    } catch (e) {
        catalog.failedEffects.push({ reason: 'fatal', message: String(e) });
    } finally {
        try {
            if (layer) try { layer.remove(); } catch (e) { }
            if (comp) try { comp.remove(); } catch (e) { }
        } catch (cleanupErr) { }
        FX_IO.logStep('FINALLY_CLEANUP_DONE');
        try {
            var outputPath = FX_IO.writeArtifactWithFallback('effects-catalog.json', catalog);
            FX_IO.logStep('AFTER_WRITE_JSON ' + outputPath + ' bytes=' + (new File(outputPath).length || 0));
        } catch (writeErr) {
            FX_IO.logStep('WRITE_ERROR ' + String(writeErr));
        }
    }
})();
