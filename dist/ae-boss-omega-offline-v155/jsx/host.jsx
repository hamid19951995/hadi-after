/* AE Studio Chat host bridge. All mutations stay inside one undo group. */
function aeStudioJson(value) {
    return JSON.stringify(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\r?\n/g, "\\n");
}

function aeStudioSafePath(path) {
    var value = path === undefined || path === null ? "" : String(path);
    if (!value || value.length > 4096 || /[\x00-\x1F]/.test(value)) return false;
    return !/(^|[\\\/])\.\.([\\\/]|$)/.test(value);
}

function aeStudioPathInside(path, parent) {
    if (!aeStudioSafePath(path) || !aeStudioSafePath(parent)) return false;
    var childFile = new File(path);
    var parentFolder = new Folder(parent);
    var child = childFile.fsName.toLowerCase();
    var root = parentFolder.fsName.toLowerCase().replace(/[\\\/]$/, "") + "/";
    return child.indexOf(root) === 0;
}

function aeStudioSafeScript(source) {
    var value = source === undefined || source === null ? "" : String(source);
    if (!value || value.length > 200000) return false;
    return !/(?:system\.callSystem|new\s+Socket|BridgeTalk|XMLHttpRequest|\$\.evalFile|\bapp\.open\s*\(|\beval\s*\()/i.test(value);
}

function aeStudioRenderStatus(status) {
    var names = ["WILL_CONTINUE", "NEEDS_OUTPUT", "UNQUEUED", "QUEUED", "RENDERING", "USER_STOPPED", "ERR_STOPPED", "DONE"];
    for (var statusIndex = 0; statusIndex < names.length; statusIndex++) {
        var name = names[statusIndex];
        if (typeof RQItemStatus !== "undefined" && RQItemStatus[name] !== undefined && status === RQItemStatus[name]) return name;
        if (String(status) === name || String(status) === "RQItemStatus." + name) return name;
    }
    return String(status);
}

function aeStudioFileEvidence(path) {
    var evidence = { file: path || null, exists: false, bytes: 0 };
    try {
        if (path && aeStudioSafePath(path)) {
            var outputFile = new File(path);
            evidence.exists = outputFile.exists === true;
            evidence.bytes = evidence.exists ? Number(outputFile.length) || 0 : 0;
        }
    } catch (fileEvidenceError) { evidence.exists = false; evidence.bytes = 0; }
    return evidence;
}

function getProjectSummary() {
    var project = app.project;
    if (!project) return { project: null, message: "No project is open." };
    var active = project.activeItem;
    var selectedLayers = [];
    var compositions = [];
    var projectItems = [];
    var renderQueueItems = [];
    var layerCount = 0;
    for (var itemIndex = 1; itemIndex <= project.numItems; itemIndex++) {
        var item = project.item(itemIndex);
        if (item instanceof CompItem) {
            var composition = item;
            var compositionInfo = { name: composition.name, width: composition.width, height: composition.height, duration: composition.duration, frameRate: composition.frameRate, layers: composition.numLayers, layerItems: [] };
            var maxLayers = Math.min(composition.numLayers, 100);
            for (var layerIndex = 1; layerIndex <= maxLayers; layerIndex++) {
                var layer = composition.layer(layerIndex);
                var layerInfo = { name: layer.name, index: layer.index, type: layer.matchName, enabled: layer.enabled, locked: layer.locked, threeD: layer.threeDLayer, inPoint: layer.inPoint, outPoint: layer.outPoint };
                try {
                    if (layer.source && layer.source.name) layerInfo.source = layer.source.name;
                    if (layer.source && layer.source.mainSource && layer.source.mainSource.file) layerInfo.file = layer.source.mainSource.file.fsName;
                } catch (sourceError) { }
                try {
                    var transformGroup = layer.property("ADBE Transform Group");
                    var positionProperty = transformGroup && transformGroup.property("ADBE Position");
                    var scaleProperty = transformGroup && transformGroup.property("ADBE Scale");
                    var rotationProperty = transformGroup && transformGroup.property("ADBE Rotate Z");
                    var opacityProperty = transformGroup && transformGroup.property("ADBE Opacity");
                    layerInfo.keyframes = { position: positionProperty ? positionProperty.numKeys : 0, opacity: opacityProperty ? opacityProperty.numKeys : 0 };
                    layerInfo.properties = { position: positionProperty ? positionProperty.value : null, scale: scaleProperty ? scaleProperty.value : null, rotation: rotationProperty ? rotationProperty.value : null, opacity: opacityProperty ? opacityProperty.value : null };
                    if (opacityProperty) { layerInfo.opacityExpression = opacityProperty.expression || ""; layerInfo.opacityExpressionError = opacityProperty.expressionError || ""; }
                } catch (keyframeError) { layerInfo.keyframes = { position: 0, opacity: 0 }; }
                try {
                    if (layer.property("Source Text")) layerInfo.text = layer.property("Source Text").value.text;
                } catch (textError) { }
                try {
                    var layerEffects = layer.property("ADBE Effect Parade");
                    layerInfo.effects = [];
                    if (layerEffects) for (var effectIndex = 1; effectIndex <= layerEffects.numProperties; effectIndex++) layerInfo.effects.push(layerEffects.property(effectIndex).name);
                } catch (layerEffectError) { layerInfo.effects = []; }
                compositionInfo.layerItems.push(layerInfo);
            }
            if (composition.numLayers > maxLayers) compositionInfo.truncated = composition.numLayers - maxLayers;
            compositions.push(compositionInfo);
            if (active === composition) layerCount = composition.numLayers;
        } else {
            var itemInfo = { name: item.name, type: item.typeName };
            try {
                if (item instanceof FootageItem && item.file) itemInfo.file = item.file.fsName;
                if (item instanceof FootageItem && item.mainSource && item.mainSource.duration) itemInfo.duration = item.mainSource.duration;
            } catch (footageError) { }
            projectItems.push(itemInfo);
        }
    }
    if (active && active.selectedLayers) {
        for (var index = 0; index < active.selectedLayers.length; index++) {
            var selected = active.selectedLayers[index];
            selectedLayers.push({ name: selected.name, type: selected.matchName, index: selected.index, inPoint: selected.inPoint, outPoint: selected.outPoint });
        }
    }
    if (project.renderQueue) {
        for (var queueIndex = 1; queueIndex <= project.renderQueue.numItems; queueIndex++) {
            var queueItem = project.renderQueue.item(queueIndex);
            var queueInfo = { index: queueIndex, status: aeStudioRenderStatus(queueItem.status), composition: queueItem.comp ? queueItem.comp.name : null, outputModules: [] };
            try {
                for (var outputIndex = 1; outputIndex <= Math.min(queueItem.numOutputModules, 32); outputIndex++) {
                    var outputModule = queueItem.outputModule(outputIndex);
                    var outputEvidence = aeStudioFileEvidence(outputModule.file ? outputModule.file.fsName : null);
                    outputEvidence.template = outputModule.name;
                    queueInfo.outputModules.push(outputEvidence);
                }
                queueInfo.outputModulesTruncated = queueItem.numOutputModules > 32;
            } catch (queueOutputError) { queueInfo.outputModulesTruncated = true; }
            renderQueueItems.push(queueInfo);
        }
    }
    return {
        app: { name: "Adobe After Effects", version: app.version, build: app.buildName },
        project: project.file ? project.file.fsName : "Untitled project",
        items: project.numItems,
        activeItem: active ? active.name : null,
        activeType: active ? active.typeName : null,
        width: active && active.width ? active.width : null,
        height: active && active.height ? active.height : null,
        selectedLayers: selectedLayers,
        compositions: compositions,
        projectItems: projectItems,
        layerCount: layerCount,
        renderQueueCount: project.renderQueue ? project.renderQueue.numItems : 0,
        renderQueueItems: renderQueueItems,
        currentTime: active && active.time !== undefined ? active.time : null,
        workAreaStart: active && active.workAreaStart !== undefined ? active.workAreaStart : null,
        workAreaDuration: active && active.workAreaDuration !== undefined ? active.workAreaDuration : null
    };
}

function getProjectHealth() {
    var project = app.project;
    if (!project) return { ok: false, message: "No project is open.", issueCount: 0, warningCount: 1, issues: [], warnings: ["No project is open."] };
    var issues = [];
    var warnings = [];
    for (var itemIndex = 1; itemIndex <= project.numItems; itemIndex++) {
        var item = project.item(itemIndex);
        if (item instanceof FootageItem) {
            try {
                if (item.file && !item.file.exists) issues.push({ type: "missing-footage", item: item.name, path: item.file.fsName });
            } catch (footageError) { warnings.push("Could not inspect footage: " + item.name); }
        }
        if (item instanceof CompItem) {
            if (item.numLayers === 0) warnings.push("Empty composition: " + item.name);
            for (var layerIndex = 1; layerIndex <= item.numLayers; layerIndex++) {
                var layer = item.layer(layerIndex);
                try {
                    var opacity = layer.property("ADBE Transform Group").property("ADBE Opacity");
                    if (opacity && opacity.expressionError) issues.push({ type: "expression-error", composition: item.name, layer: layer.name, message: opacity.expressionError });
                } catch (expressionError) { }
            }
        }
    }
    if (project.renderQueue && project.renderQueue.numItems === 0) warnings.push("Render Queue is empty.");
    return { ok: issues.length === 0, project: project.file ? project.file.fsName : "Untitled project", issueCount: issues.length, warningCount: warnings.length, issues: issues, warnings: warnings, checkedAt: new Date().toISOString() };
}

function aeStudioFindComposition(summary, name) {
    if (!summary || !summary.compositions) return null;
    for (var index = 0; index < summary.compositions.length; index++) if (summary.compositions[index].name === name) return summary.compositions[index];
    return null;
}

function aeStudioCountLayers(summary, compName, layerName, text) {
    var comp = aeStudioFindComposition(summary, compName), count = 0;
    if (!comp || !comp.layerItems) return count;
    for (var index = 0; index < comp.layerItems.length; index++) {
        var layer = comp.layerItems[index];
        if (layer.name === layerName && (text === null || layer.text === text)) count++;
    }
    return count;
}

function aeStudioFindLayer(summary, compName, layerName) {
    var comp = aeStudioFindComposition(summary, compName);
    if (!comp || !comp.layerItems) return null;
    for (var index = 0; index < comp.layerItems.length; index++) if (comp.layerItems[index].name === layerName) return comp.layerItems[index];
    return null;
}

function aeStudioValueMatches(actual, expected) {
    if (!(actual instanceof Array) || !(expected instanceof Array) || actual.length !== expected.length) return false;
    for (var index = 0; index < actual.length; index++) if (Math.abs(Number(actual[index]) - Number(expected[index])) > 0.001) return false;
    return true;
}

function aeStudioLayerMatches(summary, compName, layerName, text) {
    return aeStudioCountLayers(summary, compName, layerName, text) > 0;
}

function aeStudioVerifyExpectedState(expected, summary) {
    if (!expected || !summary) return false;
    var verifiedCount = 0, valid = true;
    var compositions = expected.compositions || [];
    var layers = expected.layers || [];
    var queued = expected.renderQueueCompositions || [];
    for (var compIndex = 0; compIndex < compositions.length; compIndex++) {
        var expectedComp = compositions[compIndex];
        var actualComp = aeStudioFindComposition(summary, expectedComp.name);
        if (!actualComp) { valid = false; continue; }
        if (expectedComp.width !== undefined && Number(actualComp.width) !== Number(expectedComp.width)) valid = false;
        if (expectedComp.height !== undefined && Number(actualComp.height) !== Number(expectedComp.height)) valid = false;
        if (expectedComp.duration !== undefined && Math.abs(Number(actualComp.duration) - Number(expectedComp.duration)) > 0.0001) valid = false;
        if (expectedComp.frameRate !== undefined && Math.abs(Number(actualComp.frameRate) - Number(expectedComp.frameRate)) > 0.0001) valid = false;
        verifiedCount++;
    }
    for (var layerIndex = 0; layerIndex < layers.length; layerIndex++) {
        var expectedLayer = layers[layerIndex];
        var compName = expectedLayer.composition || summary.activeItem;
        var actualLayer = aeStudioFindLayer(summary, compName, expectedLayer.name);
        if (!actualLayer) { valid = false; continue; }
        if (expectedLayer.text !== undefined && actualLayer.text !== expectedLayer.text) valid = false;
        if (expectedLayer.type !== undefined && actualLayer.type !== expectedLayer.type) valid = false;
        if (expectedLayer.minPositionKeyframes !== undefined && (!actualLayer.keyframes || actualLayer.keyframes.position < Number(expectedLayer.minPositionKeyframes))) valid = false;
        if (expectedLayer.minOpacityKeyframes !== undefined && (!actualLayer.keyframes || actualLayer.keyframes.opacity < Number(expectedLayer.minOpacityKeyframes))) valid = false;
        verifiedCount++;
    }
    var queueItems = summary.renderQueueItems || [];
    for (var queueIndex = 0; queueIndex < queued.length; queueIndex++) {
        var found = false;
        for (var itemIndex = 0; itemIndex < queueItems.length; itemIndex++) if (queueItems[itemIndex].composition === queued[queueIndex]) found = true;
        if (!found) valid = false;
        verifiedCount++;
    }
    return valid && verifiedCount > 0;
}

function aeStudioEvidenceSnapshot(summary) {
    if (!summary) return null;
    var compositions = [], source = summary.compositions || [];
    for (var compIndex = 0; compIndex < source.length && compIndex < 32; compIndex++) {
        var comp = source[compIndex], layerItems = [], sourceLayers = comp.layerItems || [];
        for (var layerIndex = 0; layerIndex < sourceLayers.length && layerIndex < 100; layerIndex++) {
            var layer = sourceLayers[layerIndex];
            layerItems.push({ name: layer.name, type: layer.type, text: layer.text, keyframes: layer.keyframes || {}, properties: layer.properties || {}, effects: layer.effects || [] });
        }
        compositions.push({ name: comp.name, width: comp.width, height: comp.height, duration: comp.duration, frameRate: comp.frameRate, layers: comp.layers, layerItems: layerItems });
    }
    return { project: summary.project, activeItem: summary.activeItem, activeType: summary.activeType, items: summary.items, layerCount: summary.layerCount, compositions: compositions, selectedLayers: (summary.selectedLayers || []).slice(0, 32), projectItems: (summary.projectItems || []).slice(0, 64), renderQueueCount: summary.renderQueueCount, renderQueueItems: (summary.renderQueueItems || []).slice(0, 32) };
}

function aeStudioBuildMutationReadback(command, payload, result, before, after) {
    var verified = false, strategy = "state-delta", expected = null;
    if (!result || result.ok !== true || !after || !after.project || !after.compositions) return { verified: false, strategy: "invalid-readback", before: before, after: after, expected: expected };
    if (command === "createProject") {
        var compName = payload.name || "AE Studio Project";
        var comp = aeStudioFindComposition(after, compName);
        var expectedWidth = Math.max(16, Number(payload.width) || 1920);
        var expectedHeight = Math.max(16, Number(payload.height) || 1080);
        var expectedDuration = Math.max(0.1, Number(payload.duration) || 10);
        var expectedFrameRate = Math.max(1, Number(payload.frameRate) || 30);
        expected = { composition: compName, width: expectedWidth, height: expectedHeight, duration: expectedDuration, frameRate: expectedFrameRate };
        verified = !!(comp && after.compositions.length > (before && before.compositions ? before.compositions.length : 0) && comp.width === expectedWidth && comp.height === expectedHeight && Math.abs(comp.duration - expectedDuration) < 0.0001 && Math.abs(comp.frameRate - expectedFrameRate) < 0.0001);
        strategy = "composition-properties";
    } else if (command === "addTextLayer") {
        var activeCompName = after.activeItem;
        var text = payload.text || "AE Studio";
        var layerName = payload.name || text;
        expected = { composition: activeCompName, layer: layerName, text: text };
        verified = aeStudioCountLayers(after, activeCompName, layerName, text) > aeStudioCountLayers(before, activeCompName, layerName, text);
        strategy = "text-layer-content";
    } else if (command === "queueComposition") {
        var queueName = after.activeItem;
        var queueItems = after.renderQueueItems || [];
        for (var queueIndex = 0; queueIndex < queueItems.length; queueIndex++) if (queueItems[queueIndex].composition === queueName) verified = true;
        verified = verified && after.renderQueueCount > (before ? before.renderQueueCount : 0);
        expected = { renderQueueComposition: queueName };
        strategy = "render-queue-membership";
    } else if (["addSolidLayer", "addRectangleShape", "addEllipseShape", "addCamera", "addLight"].indexOf(command) >= 0) {
        var visualComp = after.activeItem;
        var visualName = payload.name || ({ addSolidLayer: "AE Studio Solid", addRectangleShape: "AE Studio Rectangle", addEllipseShape: "AE Studio Ellipse", addCamera: "AE Studio Camera", addLight: "AE Studio Light" })[command];
        var visualLayer = aeStudioFindLayer(after, visualComp, visualName);
        var beforeVisualCount = aeStudioCountLayers(before, visualComp, visualName, null);
        expected = { composition: visualComp, layer: visualName, type: command === "addSolidLayer" ? "ADBE AV Layer" : command === "addCamera" ? "ADBE Camera Layer" : command === "addLight" ? "ADBE Light Layer" : "ADBE Vector Layer" };
        verified = !!(visualLayer && visualLayer.type === expected.type && aeStudioCountLayers(after, visualComp, visualName, null) > beforeVisualCount);
        strategy = "typed-layer-created";
    } else if (command === "animateSelectedPosition" || command === "animateSelectedOpacity") {
        var selectedName = before && before.selectedLayers && before.selectedLayers.length ? before.selectedLayers[0].name : null;
        var animatedLayer = selectedName ? aeStudioFindLayer(after, after.activeItem, selectedName) : null;
        var animatedBefore = selectedName ? aeStudioFindLayer(before, before.activeItem, selectedName) : null;
        var keyName = command === "animateSelectedPosition" ? "position" : "opacity";
        expected = { composition: after.activeItem, layer: selectedName, keyframes: keyName, minimum: 2 };
        verified = !!(animatedLayer && animatedLayer.keyframes && animatedLayer.keyframes[keyName] >= 2 && (!animatedBefore || animatedLayer.keyframes[keyName] > animatedBefore.keyframes[keyName]));
        strategy = "keyframe-count-increased";
    } else if (command === "transformSelectedLayer" || command === "updateSelectedLayer" || command === "editLayer") {
        var targetName = payload.newName || payload.name || (before && before.selectedLayers && before.selectedLayers[0] && before.selectedLayers[0].name);
        var editedLayer = targetName ? aeStudioFindLayer(after, after.activeItem, targetName) : null;
        var priorLayer = targetName ? aeStudioFindLayer(before, before.activeItem, targetName) : null;
        var propertyChecks = [];
        if (payload.position) propertyChecks.push(aeStudioValueMatches(editedLayer && editedLayer.properties && editedLayer.properties.position, payload.position));
        if (payload.scale) propertyChecks.push(aeStudioValueMatches(editedLayer && editedLayer.properties && editedLayer.properties.scale, payload.scale));
        if (payload.rotation !== undefined) propertyChecks.push(!!(editedLayer && Math.abs(Number(editedLayer.properties.rotation) - Number(payload.rotation)) <= 0.001));
        if (payload.opacity !== undefined) propertyChecks.push(!!(editedLayer && Math.abs(Number(editedLayer.properties.opacity) - Number(payload.opacity)) <= 0.001));
        if (payload.newName) propertyChecks.push(!!editedLayer);
        if (payload.name && !payload.newName && command === "updateSelectedLayer") propertyChecks.push(!!editedLayer);
        expected = { composition: after.activeItem, layer: targetName, propertiesVerified: propertyChecks.length };
        verified = !!(editedLayer && propertyChecks.length > 0 && propertyChecks.every(function (value) { return value; }) && (JSON.stringify(priorLayer) !== JSON.stringify(editedLayer) || command === "transformSelectedLayer"));
        strategy = "layer-properties-match";
    } else if (command === "addDropShadow" || command === "addGaussianBlur") {
        var effectTarget = before && before.selectedLayers && before.selectedLayers.length ? before.selectedLayers[0].name : null;
        var effectLayer = effectTarget ? aeStudioFindLayer(after, after.activeItem, effectTarget) : null;
        var expectedEffect = command === "addDropShadow" ? "drop shadow" : "gaussian blur";
        expected = { composition: after.activeItem, layer: effectTarget, effect: expectedEffect };
        verified = !!(effectLayer && effectLayer.effects && effectLayer.effects.some(function (name) { return String(name).toLowerCase().indexOf(expectedEffect) >= 0; }));
        strategy = "effect-present";
    } else if (command === "removeSelectedLayers") {
        var removedNames = before && before.selectedLayers ? before.selectedLayers.map(function (layer) { return layer.name; }) : [];
        var remaining = after.compositions.filter(function (comp) { return comp.name === before.activeItem; })[0];
        var allRemoved = !!(remaining && before.layerCount > after.layerCount);
        for (var removedIndex = 0; removedIndex < removedNames.length; removedIndex++) if (aeStudioFindLayer(after, before.activeItem, removedNames[removedIndex])) allRemoved = false;
        expected = { composition: before.activeItem, removedLayers: removedNames };
        verified = allRemoved;
        strategy = "selected-layers-absent";
    } else if (command === "updateComposition") {
        var updatedComp = aeStudioFindComposition(after, after.activeItem);
        expected = { composition: after.activeItem, width: payload.width, height: payload.height, duration: payload.duration, frameRate: payload.frameRate };
        verified = !!updatedComp && (payload.width === undefined || updatedComp.width === Number(payload.width)) && (payload.height === undefined || updatedComp.height === Number(payload.height)) && (payload.duration === undefined || Math.abs(updatedComp.duration - Number(payload.duration)) < 0.0001) && (payload.frameRate === undefined || Math.abs(updatedComp.frameRate - Number(payload.frameRate)) < 0.0001);
        strategy = "composition-properties";
    } else if (command === "openComposition") {
        expected = { activeComposition: payload.name || null };
        verified = !!(after.activeType === "Composition" && after.activeItem === payload.name && aeStudioFindComposition(after, payload.name));
        strategy = "active-composition";
    } else if (command === "renderQueue") {
        var beforeQueue = before && before.renderQueueItems || [];
        var afterQueue = after.renderQueueItems || [];
        var targetedQueue = beforeQueue.filter(function (item) { return aeStudioRenderStatus(item.status) === "QUEUED"; });
        verified = targetedQueue.length > 0 && targetedQueue.every(function (target) {
            var renderedItem = afterQueue.filter(function (item) { return item.index === target.index && item.composition === target.composition; })[0];
            if (!renderedItem || aeStudioRenderStatus(renderedItem.status) !== "DONE" || renderedItem.outputModulesTruncated) return false;
            var outputs = renderedItem.outputModules || [];
            var expectedOutputs = target.outputModules || [];
            if (!outputs.length || expectedOutputs.length !== outputs.length) return false;
            return outputs.every(function (output, outputIndex) {
                return !!(output.file && output.file === expectedOutputs[outputIndex].file && output.exists === true && Number(output.bytes) > 0);
            });
        });
        expected = { renderQueueCompleted: true, items: targetedQueue.length, outputFilesVerified: verified };
        strategy = "render-queue-completed";
    } else if (command === "importFootage") {
        var importComp = after.activeItem;
        var importedName = payload.name || null;
        var projectItemAdded = (after.projectItems || []).length > (before && before.projectItems ? before.projectItems.length : 0);
        var importLayerAdded = after.layerCount > (before ? before.layerCount : 0);
        var namedImportLayer = !importedName || !!aeStudioFindLayer(after, importComp, importedName);
        verified = !!(projectItemAdded && importLayerAdded && namedImportLayer);
        expected = { composition: importComp, footage: importedName || payload.path, layerCountIncreased: true };
        strategy = "footage-and-layer-imported";
    } else if (command === "buildAudioTeaser") {
        var teaserName = payload.name || "Audio Teaser";
        var teaser = aeStudioFindComposition(after, teaserName);
        var titleName = "Audio Teaser Title", subtitleName = "Audio Teaser Subtitle";
        var titleLayer = aeStudioFindLayer(after, teaserName, titleName);
        var subtitleLayer = aeStudioFindLayer(after, teaserName, subtitleName);
        expected = { composition: teaserName, title: payload.title || "AUDIO TEASER", subtitle: payload.subtitle || "Sound tells the story", dimensions: [Number(payload.width) || 1920, Number(payload.height) || 1080] };
        verified = !!(teaser && after.compositions.length > (before && before.compositions ? before.compositions.length : 0) && teaser.width === expected.dimensions[0] && teaser.height === expected.dimensions[1] && titleLayer && titleLayer.text === expected.title && subtitleLayer && subtitleLayer.text === expected.subtitle);
        strategy = "audio-teaser-composition-and-text";
    } else if (command === "buildAntiTheftTeaser") {
        var previousCompositions = before && before.compositions || [];
        var antiTheftComposition = null;
        for (var antiTheftIndex = 0; antiTheftIndex < after.compositions.length; antiTheftIndex++) {
            var candidate = after.compositions[antiTheftIndex];
            var existedBefore = previousCompositions.some(function (item) { return item.name === candidate.name; });
            if (!existedBefore && candidate.name.indexOf("Anti-Theft Awareness Teaser") === 0) { antiTheftComposition = candidate; break; }
        }
        var antiTheftTitle = antiTheftComposition && aeStudioFindLayer(after, antiTheftComposition.name, "Title - Protect What Matters");
        var antiTheftMessage = antiTheftComposition && aeStudioFindLayer(after, antiTheftComposition.name, "Message - Learn Secure Prevent");
        var antiTheftCta = antiTheftComposition && aeStudioFindLayer(after, antiTheftComposition.name, "CTA - Stay Alert");
        expected = { composition: antiTheftComposition && antiTheftComposition.name || "Anti-Theft Awareness Teaser", dimensions: [1920, 1080], title: "PROTECT WHAT MATTERS", animatedTextLayers: 3 };
        verified = !!(antiTheftComposition && antiTheftComposition.width === 1920 && antiTheftComposition.height === 1080 && antiTheftComposition.duration === 15 && antiTheftComposition.frameRate === 30 && antiTheftTitle && antiTheftTitle.text === expected.title && antiTheftTitle.keyframes.opacity >= 2 && antiTheftMessage && antiTheftMessage.text === "Learn the signs. Secure your space. Prevent theft." && antiTheftMessage.keyframes.opacity >= 2 && antiTheftCta && antiTheftCta.text === "STAY ALERT  |  REPORT SUSPICIOUS ACTIVITY" && antiTheftCta.keyframes.opacity >= 2);
        strategy = "anti-theft-teaser-composition-and-animation";
    } else if (command === "duplicateSelectedLayer") {
        var duplicateCompName = before && before.activeItem;
        var duplicateCompBefore = aeStudioFindComposition(before, duplicateCompName);
        var duplicateCompAfter = aeStudioFindComposition(after, duplicateCompName);
        var duplicateSourceName = before && before.selectedLayers && before.selectedLayers.length ? before.selectedLayers[0].name : null;
        var duplicateCountBefore = duplicateSourceName ? aeStudioCountLayers(before, duplicateCompName, duplicateSourceName, null) : 0;
        var duplicateCountAfter = duplicateSourceName ? aeStudioCountLayers(after, duplicateCompName, duplicateSourceName, null) : 0;
        expected = { composition: duplicateCompName, duplicatedLayer: duplicateSourceName, layerCountIncrease: 1 };
        verified = !!(duplicateCompBefore && duplicateCompAfter && duplicateSourceName && duplicateCompAfter.layers === duplicateCompBefore.layers + 1 && duplicateCountAfter > duplicateCountBefore);
        strategy = "selected-layer-duplicate-count";
    } else if (command === "setOpacityExpression") {
        var expressionTarget = before && before.selectedLayers && before.selectedLayers.length ? before.selectedLayers[0].name : null;
        var expressionLayer = expressionTarget ? aeStudioFindLayer(after, after.activeItem, expressionTarget) : null;
        expected = { composition: after.activeItem, layer: expressionTarget, expression: payload.source };
        verified = !!(expressionLayer && expressionLayer.opacityExpression === payload.source && !expressionLayer.opacityExpressionError);
        strategy = "expression-content-and-health";
    } else if (command === "openProject" || command === "restoreSnapshot") {
        var requestedProject = String(payload.path || "").replace(/\\/g, "/").toLowerCase();
        var actualProject = String(after.project || "").replace(/\\/g, "/").toLowerCase();
        expected = { project: payload.path || null };
        verified = !!(requestedProject && actualProject === requestedProject);
        strategy = "active-project-path";
    } else if (command === "runScript") {
        expected = payload.expectedState || null;
        verified = aeStudioVerifyExpectedState(expected, after);
        strategy = "declared-expected-state";
    } else if (command === "saveProject") {
        var savedFile = aeStudioFileEvidence(after.project);
        var requestedSavePath = payload.path ? new File(payload.path).fsName : null;
        expected = { projectFileExists: savedFile.exists, projectFile: savedFile, requestedPath: requestedSavePath };
        verified = !!(after.project !== "Untitled project" && savedFile.exists && savedFile.bytes > 0 && (!requestedSavePath || after.project === requestedSavePath));
        strategy = "project-file-exists";
    } else if (command === "snapshotProject") {
        expected = { snapshotPath: result.path || null };
        try { verified = !!(result.path && new File(result.path).exists); } catch (snapshotError) { verified = false; }
        strategy = "snapshot-file-exists";
    } else {
        verified = false;
        expected = { semanticVerifier: "unavailable" };
        strategy = "semantic-verifier-unavailable";
    }
    return { verified: verified, strategy: strategy, expected: expected, before: aeStudioEvidenceSnapshot(before), after: aeStudioEvidenceSnapshot(after) };
}

function createProject(payload) {
    var data = payload || {};
    var width = Math.max(16, Number(data.width) || 1920);
    var height = Math.max(16, Number(data.height) || 1080);
    var duration = Math.max(0.1, Number(data.duration) || 10);
    var frameRate = Math.max(1, Number(data.frameRate) || 30);
    var name = data.name || "AE Studio Project";
    app.beginUndoGroup("AE Studio: Create Project");
    try {
        if (!app.project) app.newProject();
        var comp = app.project.items.addComp(name, width, height, 1, duration, frameRate);
        comp.openInViewer();
        return { ok: true, message: "Created " + name, item: comp.name, width: width, height: height, duration: duration, frameRate: frameRate };
    } catch (error) {
        return { ok: false, message: error.toString() };
    } finally {
        app.endUndoGroup();
    }
}

function addTextLayer(payload) {
    var comp = app.project && app.project.activeItem;
    if (!(comp instanceof CompItem)) return { ok: false, message: "Open or select a composition first." };
    var text = payload && payload.text ? payload.text : "AE Studio";
    app.beginUndoGroup("AE Studio: Add Text");
    try {
        var layer = comp.layers.addText(text);
        layer.name = payload && payload.name ? payload.name : text;
        layer.property("Transform").property("Position").setValue([comp.width / 2, comp.height / 2]);
        layer.selected = true;
        return { ok: true, message: "Added text layer: " + layer.name };
    } catch (error) {
        return { ok: false, message: error.toString() };
    } finally {
        app.endUndoGroup();
    }
}

function selectLayer(payload) {
    var comp = app.project && app.project.activeItem;
    if (!(comp instanceof CompItem)) return { ok: false, message: "Open or select a composition first." };
    var data = payload || {};
    var target = data.index !== undefined ? comp.layer(Number(data.index)) : null;
    if (!target && data.name) {
        for (var index = 1; index <= comp.numLayers; index++) {
            if (comp.layer(index).name === String(data.name)) { target = comp.layer(index); break; }
        }
    }
    if (!target) return { ok: false, message: "Layer not found: " + (data.name || data.index || "unknown") };
    for (var layerIndex = 1; layerIndex <= comp.numLayers; layerIndex++) comp.layer(layerIndex).selected = false;
    target.selected = true;
    return { ok: true, message: "Selected layer: " + target.name, layer: { name: target.name, index: target.index, type: target.matchName } };
}

function inspectLayer(payload) {
    var comp = app.project && app.project.activeItem;
    if (!(comp instanceof CompItem)) return { ok: false, message: "Open or select a composition first." };
    var data = payload || {};
    var layer = data.index !== undefined ? comp.layer(Number(data.index)) : null;
    if (!layer && data.name) {
        for (var index = 1; index <= comp.numLayers; index++) {
            if (comp.layer(index).name === String(data.name)) { layer = comp.layer(index); break; }
        }
    }
    if (!layer) return { ok: false, message: "Layer not found: " + (data.name || data.index || "unknown") };
    var details = { name: layer.name, index: layer.index, type: layer.matchName, enabled: layer.enabled, locked: layer.locked, threeD: layer.threeDLayer, inPoint: layer.inPoint, outPoint: layer.outPoint, startTime: layer.startTime, parent: layer.parent ? layer.parent.name : null, effects: [], properties: {} };
    try {
        var transform = layer.property("ADBE Transform Group");
        if (transform) {
            ["ADBE Position", "ADBE Scale", "ADBE Rotate Z", "ADBE Opacity", "ADBE Anchor Point"].forEach(function (propertyId) {
                var property = transform.property(propertyId);
                if (property) details.properties[propertyId] = property.value;
            });
        }
    } catch (transformError) { }
    try {
        var textProperty = layer.property("ADBE Text Properties").property("ADBE Text Document");
        if (textProperty) {
            var document = textProperty.value;
            details.text = { value: document.text, font: document.font, fontSize: document.fontSize, fillColor: document.fillColor };
        }
    } catch (textError) { }
    try {
        var effectGroup = layer.property("ADBE Effect Parade");
        if (effectGroup) for (var effectIndex = 1; effectIndex <= effectGroup.numProperties; effectIndex++) details.effects.push(effectGroup.property(effectIndex).name);
    } catch (effectError) { }
    return { ok: true, composition: comp.name, layer: details };
}

function addSolidLayer(payload) {
    var comp = app.project && app.project.activeItem;
    if (!(comp instanceof CompItem)) return { ok: false, message: "Open or select a composition first." };
    var data = payload || {};
    var color = data.color instanceof Array ? data.color : [0.08, 0.12, 0.14];
    var width = Number(data.width) || comp.width;
    var height = Number(data.height) || comp.height;
    app.beginUndoGroup("AE Studio: Add Solid");
    try {
        var layer = comp.layers.addSolid(color, data.name || "AE Studio Solid", width, height, 1, comp.duration);
        return { ok: true, message: "Added solid layer: " + layer.name };
    } catch (error) {
        return { ok: false, message: error.toString() };
    } finally {
        app.endUndoGroup();
    }
}

function addRectangleShape(payload) {
    var comp = app.project && app.project.activeItem;
    if (!(comp instanceof CompItem)) return { ok: false, message: "Open or select a composition first." };
    var data = payload || {};
    var width = Math.max(1, Number(data.width) || 500);
    var height = Math.max(1, Number(data.height) || 300);
    var color = data.color instanceof Array ? data.color : [0.82, 0.95, 0.42];
    app.beginUndoGroup("AE Studio: Add Rectangle Shape");
    try {
        var shapeLayer = comp.layers.addShape();
        shapeLayer.name = data.name || "AE Studio Rectangle";
        var contents = shapeLayer.property("ADBE Root Vectors Group");
        var rectangle = contents.addProperty("ADBE Vector Shape - Rect");
        rectangle.property("ADBE Vector Rect Size").setValue([width, height]);
        rectangle.property("ADBE Vector Rect Position").setValue([0, 0]);
        var fill = contents.addProperty("ADBE Vector Graphic - Fill");
        fill.property("ADBE Vector Fill Color").setValue(color);
        shapeLayer.property("Transform").property("Position").setValue([comp.width / 2, comp.height / 2]);
        return { ok: true, message: "Added rectangle shape: " + shapeLayer.name + "." };
    } catch (error) {
        return { ok: false, message: error.toString() };
    } finally {
        app.endUndoGroup();
    }
}

function addEllipseShape(payload) {
    var comp = app.project && app.project.activeItem;
    if (!(comp instanceof CompItem)) return { ok: false, message: "Open or select a composition first." };
    var data = payload || {};
    var width = Math.max(1, Number(data.width) || 300);
    var height = Math.max(1, Number(data.height) || 300);
    var color = data.color instanceof Array ? data.color : [1, 0.55, 0.35];
    app.beginUndoGroup("AE Studio: Add Ellipse Shape");
    try {
        var shapeLayer = comp.layers.addShape();
        shapeLayer.name = data.name || "AE Studio Ellipse";
        var contents = shapeLayer.property("ADBE Root Vectors Group");
        var ellipse = contents.addProperty("ADBE Vector Shape - Ellipse");
        ellipse.property("ADBE Vector Ellipse Size").setValue([width, height]);
        ellipse.property("ADBE Vector Ellipse Position").setValue([0, 0]);
        var fill = contents.addProperty("ADBE Vector Graphic - Fill");
        fill.property("ADBE Vector Fill Color").setValue(color);
        shapeLayer.property("Transform").property("Position").setValue([comp.width / 2, comp.height / 2]);
        return { ok: true, message: "Added ellipse shape: " + shapeLayer.name + "." };
    } catch (error) {
        return { ok: false, message: error.toString() };
    } finally {
        app.endUndoGroup();
    }
}

function addThreeDLayer(payload, isLight) {
    var comp = app.project && app.project.activeItem;
    if (!(comp instanceof CompItem)) return { ok: false, message: "Open or select a composition first." };
    var data = payload || {};
    app.beginUndoGroup(isLight ? "AE Studio: Add Light" : "AE Studio: Add Camera");
    try {
        var layer = isLight ? comp.layers.addLight(data.name || "AE Studio Light", [comp.width / 2, comp.height / 2]) : comp.layers.addCamera(data.name || "AE Studio Camera", [comp.width / 2, comp.height / 2]);
        layer.threeDLayer = true;
        return { ok: true, message: "Added " + (isLight ? "light" : "camera") + ": " + layer.name + "." };
    } catch (error) {
        return { ok: false, message: error.toString() };
    } finally {
        app.endUndoGroup();
    }
}

function addDropShadow(payload) {
    var comp = app.project && app.project.activeItem;
    var selected = comp && comp.selectedLayers;
    if (!(comp instanceof CompItem) || !selected || !selected.length) return { ok: false, message: "Select a layer first." };
    var data = payload || {};
    app.beginUndoGroup("AE Studio: Add Drop Shadow");
    try {
        var effects = selected[0].property("ADBE Effect Parade");
        var effect = null;
        var effectNames = ["Drop Shadow", "ADBE Drop Shadow 2", "ADBE Drop Shadow"];
        for (var effectIndex = 0; effectIndex < effectNames.length && !effect; effectIndex++) {
            try { effect = effects.addProperty(effectNames[effectIndex]); } catch (effectError) { }
        }
        if (!effect) return { ok: false, message: "After Effects could not add a Drop Shadow effect on this layer." };
        if (data.opacity !== undefined) setEffectValue(effect, ["Opacity", "ADBE Drop Shadow-0002"], Math.max(0, Math.min(100, Number(data.opacity))));
        if (data.distance !== undefined) setEffectValue(effect, ["Distance", "ADBE Drop Shadow-0003"], Math.max(0, Number(data.distance)));
        return { ok: true, message: "Added Drop Shadow to " + selected[0].name + "." };
    } catch (error) {
        return { ok: false, message: error.toString() };
    } finally {
        app.endUndoGroup();
    }
}

function setEffectValue(effect, propertyNames, value) {
    for (var propertyIndex = 0; propertyIndex < propertyNames.length; propertyIndex++) {
        try {
            var property = effect.property(propertyNames[propertyIndex]);
            if (property) { property.setValue(value); return true; }
        } catch (propertyError) { }
    }
    return false;
}

function duplicateSelectedLayer() {
    var comp = app.project && app.project.activeItem;
    var selected = comp && comp.selectedLayers;
    if (!(comp instanceof CompItem) || !selected || !selected.length) return { ok: false, message: "Select a layer first." };
    app.beginUndoGroup("AE Studio: Duplicate Layer");
    try {
        var copy = selected[0].duplicate();
        return { ok: true, message: "Duplicated layer: " + copy.name + "." };
    } catch (error) {
        return { ok: false, message: error.toString() };
    } finally {
        app.endUndoGroup();
    }
}

function addGaussianBlur(payload) {
    var comp = app.project && app.project.activeItem;
    var selected = comp && comp.selectedLayers;
    if (!(comp instanceof CompItem) || !selected || !selected.length) return { ok: false, message: "Select a layer first." };
    var amount = Math.max(0, Number(payload && payload.amount) || 12);
    app.beginUndoGroup("AE Studio: Add Gaussian Blur");
    try {
        var effect = selected[0].property("ADBE Effect Parade").addProperty("ADBE Gaussian Blur 2");
        effect.property("ADBE Gaussian Blur 2-0001").setValue(amount);
        return { ok: true, message: "Added Gaussian Blur (" + amount + ") to " + selected[0].name + "." };
    } catch (error) {
        return { ok: false, message: error.toString() };
    } finally {
        app.endUndoGroup();
    }
}

function buildAntiTheftTeaser() {
    app.beginUndoGroup("AE Studio: Anti-Theft Teaser");
    try {
        if (!app.project) app.newProject();
        var project = app.project;
        var comp = project.items.addComp("Anti-Theft Awareness Teaser", 1920, 1080, 1, 15, 30);
        var background = comp.layers.addSolid([0.025, 0.04, 0.05], "Background", 1920, 1080, 1, 15);
        var accent = comp.layers.addShape();
        accent.name = "Warning Accent";
        var contents = accent.property("ADBE Root Vectors Group");
        var rectangle = contents.addProperty("ADBE Vector Shape - Rect");
        rectangle.property("ADBE Vector Rect Size").setValue([1300, 8]);
        var fill = contents.addProperty("ADBE Vector Graphic - Fill");
        fill.property("ADBE Vector Fill Color").setValue([1, 0.48, 0.2]);
        accent.property("Transform").property("Position").setValue([960, 610]);
        var title = comp.layers.addText("PROTECT WHAT MATTERS");
        title.name = "Title - Protect What Matters";
        title.property("Transform").property("Position").setValue([960, 410]);
        var titleDocument = title.property("ADBE Text Properties").property("ADBE Text Document").value;
        titleDocument.fontSize = 86;
        titleDocument.fillColor = [0.9, 0.96, 0.98];
        titleDocument.justification = ParagraphJustification.CENTER_JUSTIFY;
        title.property("ADBE Text Properties").property("ADBE Text Document").setValue(titleDocument);
        var message = comp.layers.addText("Learn the signs. Secure your space. Prevent theft.");
        message.name = "Message - Learn Secure Prevent";
        message.property("Transform").property("Position").setValue([960, 530]);
        var messageDocument = message.property("ADBE Text Properties").property("ADBE Text Document").value;
        messageDocument.fontSize = 34;
        messageDocument.fillColor = [0.72, 0.8, 0.82];
        messageDocument.justification = ParagraphJustification.CENTER_JUSTIFY;
        message.property("ADBE Text Properties").property("ADBE Text Document").setValue(messageDocument);
        var callToAction = comp.layers.addText("STAY ALERT  |  REPORT SUSPICIOUS ACTIVITY");
        callToAction.name = "CTA - Stay Alert";
        callToAction.property("Transform").property("Position").setValue([960, 720]);
        var ctaDocument = callToAction.property("ADBE Text Properties").property("ADBE Text Document").value;
        ctaDocument.fontSize = 30;
        ctaDocument.fillColor = [1, 0.7, 0.36];
        ctaDocument.justification = ParagraphJustification.CENTER_JUSTIFY;
        callToAction.property("ADBE Text Properties").property("ADBE Text Document").setValue(ctaDocument);
        title.property("Transform").property("Opacity").setValueAtTime(0, 0);
        title.property("Transform").property("Opacity").setValueAtTime(1, 100);
        message.property("Transform").property("Opacity").setValueAtTime(0.5, 0);
        message.property("Transform").property("Opacity").setValueAtTime(2, 100);
        callToAction.property("Transform").property("Opacity").setValueAtTime(2, 0);
        callToAction.property("Transform").property("Opacity").setValueAtTime(3.5, 100);
        comp.openInViewer();
        return { ok: true, message: "Built Anti-Theft Awareness Teaser with animated title, educational message, CTA, and editable layers." };
    } catch (error) {
        return { ok: false, message: error.toString() };
    } finally {
        app.endUndoGroup();
    }
}

function setOpacityExpression(payload) {
    var comp = app.project && app.project.activeItem;
    var selected = comp && comp.selectedLayers;
    var source = payload && payload.source ? String(payload.source) : "";
    if (!(comp instanceof CompItem) || !selected || !selected.length) return { ok: false, message: "Select a layer first." };
    if (!source) return { ok: false, message: "Provide an opacity expression." };
    app.beginUndoGroup("AE Studio: Set Opacity Expression");
    try {
        selected[0].property("Transform").property("Opacity").expression = source;
        return { ok: true, message: "Opacity expression applied to " + selected[0].name + "." };
    } catch (error) {
        return { ok: false, message: error.toString() };
    } finally {
        app.endUndoGroup();
    }
}

function removeSelectedLayers() {
    var comp = app.project && app.project.activeItem;
    var selected = comp && comp.selectedLayers;
    if (!(comp instanceof CompItem) || !selected || !selected.length) return { ok: false, message: "Select one or more layers first." };
    app.beginUndoGroup("AE Studio: Remove Layers");
    try {
        var count = selected.length;
        for (var index = count - 1; index >= 0; index--) selected[index].remove();
        return { ok: true, message: "Removed " + count + " selected layer" + (count === 1 ? "" : "s") + "." };
    } catch (error) {
        return { ok: false, message: error.toString() };
    } finally {
        app.endUndoGroup();
    }
}

function renderQueue() {
    if (!app.project || !app.project.renderQueue || app.project.renderQueue.numItems < 1) return { ok: false, message: "The Render Queue is empty." };
    try {
        app.project.renderQueue.render();
        return { ok: true, message: "Render Queue returned; output file verification is required." };
    } catch (error) {
        return { ok: false, message: error.toString() };
    }
}

function queueActiveComposition(payload) {
    var comp = app.project && app.project.activeItem;
    if (!(comp instanceof CompItem)) return { ok: false, message: "Open or select a composition first." };
    app.beginUndoGroup("AE Studio: Add To Render Queue");
    try {
        var item = app.project.renderQueue.items.add(comp);
        if (payload && payload.outputPath) {
            if (!aeStudioSafePath(payload.outputPath)) return { ok: false, message: "Render output path is invalid." };
            item.outputModule(1).file = new File(payload.outputPath);
        }
        return { ok: true, message: "Added " + comp.name + " to the Render Queue as item " + item.id + "." };
    } catch (error) {
        return { ok: false, message: error.toString() };
    } finally {
        app.endUndoGroup();
    }
}

function saveProject(payload) {
    if (!app.project) return { ok: false, message: "No project is open." };
    try {
        if (payload && payload.path) {
            if (!aeStudioSafePath(payload.path)) return { ok: false, message: "Project path is invalid." };
            app.project.save(new File(payload.path));
        }
        else if (app.project.file) app.project.save();
        else app.project.saveWithDialog();
        if (!app.project.file) return { ok: false, message: "The project was not saved. Choose a .aep path to continue." };
        return { ok: true, message: "Project saved." };
    } catch (error) {
        return { ok: false, message: error.toString() };
    }
}

function snapshotProject(payload) {
    if (!app.project) return { ok: false, message: "No project is open." };
    try {
        if (!app.project.file) app.project.saveWithDialog();
        if (!app.project.file) return { ok: false, message: "The project was not saved. Choose a .aep path before creating a snapshot." };
        app.project.save();
        var source = app.project.file;
        var folder = new Folder(source.parent.fsName + "/.ae-studio-snapshots");
        if (!folder.exists) folder.create();
        var label = payload && payload.label ? String(payload.label).replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") : "snapshot";
        var stamp = new Date().getTime();
        var target = new File(folder.fsName + "/" + source.displayName.replace(/\.aep$/i, "") + "-" + label + "-" + stamp + ".aep");
        if (!source.copy(target.fsName)) return { ok: false, message: "After Effects could not create the snapshot file." };
        return { ok: true, message: "Snapshot created: " + target.fsName, path: target.fsName };
    } catch (error) {
        return { ok: false, message: error.toString() };
    }
}

function restoreSnapshot(payload) {
    var path = payload && payload.path ? String(payload.path) : "";
    if (!path) return { ok: false, message: "Provide a snapshot path to restore." };
    try {
        if (!app.project || !app.project.file || !aeStudioPathInside(path, app.project.file.parent.fsName + "/.ae-studio-snapshots")) return { ok: false, message: "Snapshot must be inside the active project's snapshot folder." };
        var snapshot = new File(path);
        if (!snapshot.exists) return { ok: false, message: "Snapshot file not found: " + path };
        app.open(snapshot);
        return { ok: true, message: "Snapshot opened as the active After Effects project: " + snapshot.fsName, path: snapshot.fsName };
    } catch (error) {
        return { ok: false, message: error.toString() };
    }
}

function importFootage(payload) {
    var comp = app.project && app.project.activeItem;
    var path = payload && payload.path ? payload.path : "";
    if (!(comp instanceof CompItem)) return { ok: false, message: "Open or select a composition first." };
    if (!path) return { ok: false, message: "Provide a file path to import." };
    if (!aeStudioSafePath(path)) return { ok: false, message: "Import path is invalid." };
    try {
        var file = new File(path);
        if (!file.exists) return { ok: false, message: "File not found: " + path };
        var imported = app.project.importFile(new ImportOptions(file));
        var layer = comp.layers.add(imported);
        if (payload && payload.name) layer.name = payload.name;
        return { ok: true, message: "Imported " + layer.name + " into " + comp.name + "." };
    } catch (error) {
        return { ok: false, message: error.toString() };
    }
}

function buildAudioTeaser(payload) {
    var data = payload || {};
    var width = Math.max(16, Number(data.width) || 1920);
    var height = Math.max(16, Number(data.height) || 1080);
    var duration = Math.max(0.1, Number(data.duration) || 15);
    var frameRate = Math.max(1, Number(data.frameRate) || 30);
    var name = data.name || "Audio Teaser";
    var titleText = data.title || "AUDIO TEASER";
    var subtitleText = data.subtitle || "Sound tells the story";
    app.beginUndoGroup("AE Studio: Build Audio Teaser");
    try {
        if (!app.project) app.newProject();
        var project = app.project;
        var comp = project.items.addComp(name, width, height, 1, duration, frameRate);
        var background = comp.layers.addSolid([0.025, 0.04, 0.06], "Audio Teaser Background", width, height, 1, duration);
        var accent = comp.layers.addShape();
        accent.name = "Audio Teaser Accent";
        var contents = accent.property("ADBE Root Vectors Group");
        var rectangle = contents.addProperty("ADBE Vector Shape - Rect");
        rectangle.property("ADBE Vector Rect Size").setValue([width * 0.68, 8]);
        var fill = contents.addProperty("ADBE Vector Graphic - Fill");
        fill.property("ADBE Vector Fill Color").setValue([0.3, 0.85, 0.72]);
        accent.property("Transform").property("Position").setValue([width / 2, height * 0.62]);
        var title = comp.layers.addText(titleText);
        title.name = "Audio Teaser Title";
        title.property("Transform").property("Position").setValue([width / 2, height * 0.38]);
        var titleDocument = title.property("ADBE Text Properties").property("ADBE Text Document").value;
        titleDocument.fontSize = Math.max(36, Math.round(width / 22));
        titleDocument.fillColor = [0.9, 0.98, 0.96];
        titleDocument.justification = ParagraphJustification.CENTER_JUSTIFY;
        title.property("ADBE Text Properties").property("ADBE Text Document").setValue(titleDocument);
        var subtitle = comp.layers.addText(subtitleText);
        subtitle.name = "Audio Teaser Subtitle";
        subtitle.property("Transform").property("Position").setValue([width / 2, height * 0.5]);
        var subtitleDocument = subtitle.property("ADBE Text Properties").property("ADBE Text Document").value;
        subtitleDocument.fontSize = Math.max(22, Math.round(width / 48));
        subtitleDocument.fillColor = [0.55, 0.72, 0.7];
        subtitleDocument.justification = ParagraphJustification.CENTER_JUSTIFY;
        subtitle.property("ADBE Text Properties").property("ADBE Text Document").setValue(subtitleDocument);
        if (data.audioPath) {
            if (!aeStudioSafePath(data.audioPath)) return { ok: false, message: "Audio path is invalid." };
            var audioFile = new File(String(data.audioPath));
            if (!audioFile.exists) return { ok: false, message: "Generated audio file not found: " + data.audioPath };
            var audioItem = project.importFile(new ImportOptions(audioFile));
            var audioLayer = comp.layers.add(audioItem);
            audioLayer.name = data.audioName || "Generated Teaser Voiceover";
            audioLayer.startTime = 0;
        }
        comp.openInViewer();
        return { ok: true, message: "Built audio teaser: " + name + (data.audioPath ? " with generated audio." : "."), item: comp.name, width: width, height: height, duration: duration, frameRate: frameRate };
    } catch (error) {
        return { ok: false, message: error.toString() };
    } finally {
        app.endUndoGroup();
    }
}

function updateSelectedLayer(payload) {
    var comp = app.project && app.project.activeItem;
    var selected = comp && comp.selectedLayers;
    if (!(comp instanceof CompItem) || !selected || !selected.length) return { ok: false, message: "Select a layer first." };
    var layer = selected[0];
    var data = payload || {};
    app.beginUndoGroup("AE Studio: Update Layer");
    try {
        if (data.name) layer.name = String(data.name);
        if (data.opacity !== undefined) layer.property("Transform").property("Opacity").setValue(Math.max(0, Math.min(100, Number(data.opacity))));
        return { ok: true, message: "Updated selected layer: " + layer.name + "." };
    } catch (error) {
        return { ok: false, message: error.toString() };
    } finally {
        app.endUndoGroup();
    }
}

function editLayer(payload) {
    var comp = app.project && app.project.activeItem;
    if (!(comp instanceof CompItem)) return { ok: false, message: "Open or select a composition first." };
    var data = payload || {};
    var layer = data.index !== undefined ? comp.layer(Number(data.index)) : null;
    if (!layer && data.name) {
        for (var index = 1; index <= comp.numLayers; index++) {
            if (comp.layer(index).name === String(data.name)) { layer = comp.layer(index); break; }
        }
    }
    if (!layer) return { ok: false, message: "Layer not found: " + (data.name || data.index || "unknown") };
    app.beginUndoGroup("AE Studio: Edit Layer");
    try {
        var transform = layer.property("Transform");
        if (data.newName) layer.name = String(data.newName);
        if (data.opacity !== undefined) transform.property("Opacity").setValue(Math.max(0, Math.min(100, Number(data.opacity))));
        if (data.position instanceof Array && data.position.length >= 2) transform.property("Position").setValue([Number(data.position[0]), Number(data.position[1]), data.position.length > 2 ? Number(data.position[2]) : 0]);
        if (data.scale instanceof Array && data.scale.length >= 2) transform.property("Scale").setValue([Number(data.scale[0]), Number(data.scale[1]), data.scale.length > 2 ? Number(data.scale[2]) : 100]);
        if (data.rotation !== undefined) transform.property("Rotation").setValue(Number(data.rotation));
        if (data.enabled !== undefined) layer.enabled = Boolean(data.enabled);
        return { ok: true, message: "Edited layer: " + layer.name + "." };
    } catch (error) {
        return { ok: false, message: error.toString() };
    } finally {
        app.endUndoGroup();
    }
}

function animateSelectedOpacity(payload) {
    var comp = app.project && app.project.activeItem;
    var selected = comp && comp.selectedLayers;
    if (!(comp instanceof CompItem) || !selected || !selected.length) return { ok: false, message: "Select a layer first." };
    var data = payload || {};
    var start = Math.max(0, Math.min(100, Number(data.from) || 0));
    var end = Math.max(0, Math.min(100, Number(data.to) || 100));
    var duration = Math.max(0.01, Number(data.duration) || 1);
    var opacity = selected[0].property("Transform").property("Opacity");
    app.beginUndoGroup("AE Studio: Animate Opacity");
    try {
        opacity.setValueAtTime(comp.time, start);
        opacity.setValueAtTime(comp.time + duration, end);
        return { ok: true, message: "Animated opacity from " + start + "% to " + end + "% over " + duration + " seconds." };
    } catch (error) {
        return { ok: false, message: error.toString() };
    } finally {
        app.endUndoGroup();
    }
}

function animateSelectedPosition(payload) {
    var comp = app.project && app.project.activeItem;
    var selected = comp && comp.selectedLayers;
    if (!(comp instanceof CompItem) || !selected || !selected.length) return { ok: false, message: "Select a layer first." };
    var data = payload || {};
    var from = data.from instanceof Array ? data.from : [200, 540];
    var to = data.to instanceof Array ? data.to : [1600, 540];
    var duration = Math.max(0.01, Number(data.duration) || 5);
    var position = selected[0].property("Transform").property("Position");
    app.beginUndoGroup("AE Studio: Animate Position");
    try {
        position.setValueAtTime(0, [Number(from[0]), Number(from[1])]);
        position.setValueAtTime(duration, [Number(to[0]), Number(to[1])]);
        return { ok: true, message: "Animated position from [" + from.join(", ") + "] to [" + to.join(", ") + "] over " + duration + " seconds." };
    } catch (error) {
        return { ok: false, message: error.toString() };
    } finally {
        app.endUndoGroup();
    }
}

function transformSelectedLayer(payload) {
    var comp = app.project && app.project.activeItem;
    var selected = comp && comp.selectedLayers;
    if (!(comp instanceof CompItem) || !selected || !selected.length) return { ok: false, message: "Select a layer first." };
    var data = payload || {};
    var layer = selected[0];
    var transform = layer.property("Transform");
    app.beginUndoGroup("AE Studio: Transform Layer");
    try {
        if (data.position instanceof Array && data.position.length === 2) transform.property("Position").setValue([Number(data.position[0]), Number(data.position[1])]);
        if (data.scale instanceof Array && data.scale.length === 2) transform.property("Scale").setValue([Number(data.scale[0]), Number(data.scale[1])]);
        if (data.rotation !== undefined) transform.property("Rotation").setValue(Number(data.rotation));
        return { ok: true, message: "Transformed selected layer: " + layer.name + "." };
    } catch (error) {
        return { ok: false, message: error.toString() };
    } finally {
        app.endUndoGroup();
    }
}

function updateComposition(payload) {
    var comp = app.project && app.project.activeItem;
    if (!(comp instanceof CompItem)) return { ok: false, message: "Open or select a composition first." };
    var data = payload || {};
    app.beginUndoGroup("AE Studio: Update Composition");
    try {
        if (data.width) comp.width = Math.max(16, Number(data.width));
        if (data.height) comp.height = Math.max(16, Number(data.height));
        if (data.duration) comp.duration = Math.max(0.1, Number(data.duration));
        if (data.frameRate) comp.frameRate = Math.max(1, Number(data.frameRate));
        return { ok: true, message: "Updated composition: " + comp.name + "." };
    } catch (error) {
        return { ok: false, message: error.toString() };
    } finally {
        app.endUndoGroup();
    }
}

function openComposition(payload) {
    var project = app.project;
    var name = payload && payload.name ? String(payload.name).toLowerCase() : "";
    if (!project || !name) return { ok: false, message: "Provide a composition name." };
    for (var index = 1; index <= project.numItems; index++) {
        var item = project.item(index);
        if (item instanceof CompItem && item.name.toLowerCase() === name) {
            item.openInViewer();
            return { ok: true, message: "Opened composition: " + item.name + "." };
        }
    }
    return { ok: false, message: "Composition not found: " + (payload.name || "") };
}

function openProject(payload) {
    var path = payload && payload.path ? String(payload.path) : "";
    if (!path) return { ok: false, message: "Provide an After Effects project path." };
    if (!aeStudioSafePath(path)) return { ok: false, message: "Project path is invalid." };
    try {
        var file = new File(path);
        if (!file.exists) return { ok: false, message: "Project not found: " + path };
        app.open(file);
        return { ok: true, message: "Opened project: " + file.displayName + "." };
    } catch (error) {
        return { ok: false, message: error.toString() };
    }
}

function runExtendScript(source) {
    if (!aeStudioSafeScript(source)) return { ok: false, message: "Script rejected by the host safety policy." };
    app.beginUndoGroup("AE Studio: Run Script");
    try {
        var result = eval(source);
        return { ok: true, message: result === undefined ? "Script completed." : String(result) };
    } catch (error) {
        return { ok: false, message: error.toString() };
    } finally {
        app.endUndoGroup();
    }
}

function runValidationHarness(payload) {
    try {
        var extensionPath = payload && payload.extensionPath ? String(payload.extensionPath) : "";
        var harnessFile;
        if (extensionPath && aeStudioSafePath(extensionPath)) harnessFile = new File(extensionPath + "/test/TITAN_HARNESS_RUNNER.jsx");
        if (!harnessFile || !harnessFile.exists) {
            var userDataPath = Folder.userData ? Folder.userData.fsName : "";
            var fallbackPath = userDataPath + "/Adobe/CEP/extensions/com.cepresources.aechat/test/TITAN_HARNESS_RUNNER.jsx";
            harnessFile = new File(fallbackPath);
        }
        if (!harnessFile.exists) return { ok: false, message: "Validation harness file not found. Checked the CEP payload path and the default extension path: " + harnessFile.fsName };
        $.evalFile(harnessFile);
        if (typeof TitanHarness === "undefined" || !TitanHarness.runSuite) return { ok: false, message: "Validation harness did not expose TitanHarness.runSuite." };
        return { ok: true, report: TitanHarness.runSuite() };
    } catch (error) {
        return { ok: false, message: error.toString(), line: error.line || null };
    }
}

function getAEBossCapabilities() {
    var mutationCommands = ["createProject", "addTextLayer", "addSolidLayer", "addRectangleShape", "addEllipseShape", "addCamera", "addLight", "addDropShadow", "duplicateSelectedLayer", "addGaussianBlur", "buildAntiTheftTeaser", "setOpacityExpression", "removeSelectedLayers", "renderQueue", "queueComposition", "saveProject", "snapshotProject", "restoreSnapshot", "importFootage", "buildAudioTeaser", "updateSelectedLayer", "editLayer", "animateSelectedOpacity", "animateSelectedPosition", "transformSelectedLayer", "updateComposition", "openComposition", "openProject", "runScript"];
    return {
        ok: true,
        protocol: "AE-BOSS-OMEGA-HOST",
        protocolVersion: "1.0.0",
        host: "after-effects",
        hostVersion: app.version || null,
        projectOpen: !!app.project,
        capabilities: mutationCommands.map(function (command) { return { action: command, enabled: true, mutates: true, approvalRequired: true }; }),
        readOnly: ["summary", "healthReport", "capabilities", "heartbeat", "planWorkflow"]
    };
}

function getAEBossHeartbeat() {
    var project = app.project;
    return {
        ok: true,
        protocol: "AE-BOSS-OMEGA-HOST",
        protocolVersion: "1.0.0",
        host: "after-effects",
        hostVersion: app.version || null,
        projectOpen: !!project,
        projectName: project ? (project.file ? project.file.name : "Untitled project") : null,
        at: new Date().toISOString()
    };
}

function aeStudioCommand(command, payload) {
    try {
    var result;
    var requestId = payload && payload.requestId ? String(payload.requestId) : null;
    var mutationCommands = ["createProject", "addTextLayer", "addSolidLayer", "addRectangleShape", "addEllipseShape", "addCamera", "addLight", "addDropShadow", "duplicateSelectedLayer", "addGaussianBlur", "buildAntiTheftTeaser", "setOpacityExpression", "removeSelectedLayers", "renderQueue", "queueComposition", "saveProject", "snapshotProject", "restoreSnapshot", "importFootage", "buildAudioTeaser", "updateSelectedLayer", "editLayer", "animateSelectedOpacity", "animateSelectedPosition", "transformSelectedLayer", "updateComposition", "openComposition", "openProject", "runScript"];
    var isMutation = false;
    for (var mutationIndex = 0; mutationIndex < mutationCommands.length; mutationIndex++) if (mutationCommands[mutationIndex] === command) isMutation = true;
    var beforeState = isMutation ? getProjectSummary() : null;
    if (command === "summary") result = getProjectSummary();
    else if (command === "healthReport") result = getProjectHealth();
    else if (command === "capabilities") result = getAEBossCapabilities();
    else if (command === "heartbeat") result = getAEBossHeartbeat();
    else if (command === "runValidationHarness") result = runValidationHarness(payload || {});
    else if (command === "planWorkflow") result = {
        ok: true,
        mode: "plan",
        goal: (payload && (payload.goal || payload.prompt)) || "Build a polished After Effects production",
        phases: [
            "Inspect the active project and selected layers",
            "Reuse existing assets before creating new ones",
            "Create or update the target composition",
            "Add key visual layers (background, title, accent shapes)",
            "Apply motion, opacity, and effect polishing",
            "Save a snapshot before major edits",
            "Review health and render readiness"
        ],
        recommendedCommands: [
            { command: "summary", payload: {} },
            { command: "healthReport", payload: {} },
            { command: "createProject", payload: { name: "AE Studio Project", width: 1920, height: 1080, duration: 10, frameRate: 30 } },
            { command: "addSolidLayer", payload: { name: "Background", color: [0.08, 0.12, 0.14] } },
            { command: "addTextLayer", payload: { text: "Title", name: "Title" } },
            { command: "addEllipseShape", payload: { name: "Accent Circle", width: 280, height: 280, color: [1, 0.6, 0.3] } },
            { command: "transformSelectedLayer", payload: { position: [960, 540], scale: [100, 100], rotation: 0 } },
            { command: "animateSelectedOpacity", payload: { from: 0, to: 100, duration: 1 } },
            { command: "snapshotProject", payload: { label: "mvp-plan" } }
        ],
        message: "This plan keeps the work project-aware, reviewable, and reversible before executing any real AE mutation."
    };
    else if (command === "createProject") result = createProject(payload);
    else if (command === "addTextLayer") result = addTextLayer(payload);
    else if (command === "selectLayer") result = selectLayer(payload);
    else if (command === "inspectLayer") result = inspectLayer(payload);
    else if (command === "addSolidLayer") result = addSolidLayer(payload);
    else if (command === "addRectangleShape") result = addRectangleShape(payload);
    else if (command === "addEllipseShape") result = addEllipseShape(payload);
    else if (command === "addCamera") result = addThreeDLayer(payload, false);
    else if (command === "addLight") result = addThreeDLayer(payload, true);
    else if (command === "addDropShadow") result = addDropShadow(payload);
    else if (command === "duplicateSelectedLayer") result = duplicateSelectedLayer();
    else if (command === "addGaussianBlur") result = addGaussianBlur(payload);
    else if (command === "buildAntiTheftTeaser") result = buildAntiTheftTeaser();
    else if (command === "setOpacityExpression") result = setOpacityExpression(payload);
    else if (command === "removeSelectedLayers") result = removeSelectedLayers();
    else if (command === "renderQueue") result = renderQueue();
    else if (command === "queueComposition") result = queueActiveComposition(payload);
    else if (command === "saveProject") result = saveProject(payload);
    else if (command === "snapshotProject") result = snapshotProject(payload);
    else if (command === "restoreSnapshot") result = restoreSnapshot(payload);
    else if (command === "importFootage") result = importFootage(payload);
    else if (command === "buildAudioTeaser") result = buildAudioTeaser(payload);
    else if (command === "updateSelectedLayer") result = updateSelectedLayer(payload);
    else if (command === "editLayer") result = editLayer(payload);
    else if (command === "animateSelectedOpacity") result = animateSelectedOpacity(payload);
    else if (command === "animateSelectedPosition") result = animateSelectedPosition(payload);
    else if (command === "transformSelectedLayer") result = transformSelectedLayer(payload);
    else if (command === "updateComposition") result = updateComposition(payload);
    else if (command === "openComposition") result = openComposition(payload);
    else if (command === "openProject") result = openProject(payload);
    else if (command === "runScript") result = runExtendScript(payload && payload.source ? payload.source : "");
    else result = { ok: false, message: "Unknown AE Studio command: " + command };
    if (isMutation && result && typeof result === "object") {
        var afterState = getProjectSummary();
        result.hostReadback = aeStudioBuildMutationReadback(command, payload || {}, result, beforeState, afterState);
    }
    if (result && typeof result === "object") {
        result.requestId = requestId;
        result.contractVersion = "ae-bridge-response.v1";
        if (result.ok === false) result.error = { code: result.code || "HOST_COMMAND_FAILED", message: result.message || "Host command failed.", stage: "jsx-host" };
    }
    return JSON.stringify(result);
    } catch (hostError) {
        var errorMessage = "ExtendScript host command failed.";
        var errorLine = null;
        try { errorMessage = String(hostError && hostError.message ? hostError.message : hostError); } catch (messageError) { }
        try { if (hostError && hostError.line !== undefined) errorLine = parseInt(hostError.line, 10); } catch (lineError) { }
        var quotedMessage = '"' + errorMessage.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r/g, "\\r").replace(/\n/g, "\\n").replace(/\t/g, "\\t") + '"';
        var quotedRequestId = requestId === null ? "null" : '"' + String(requestId).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
        return '{"ok":false,"code":"AE_HOST_EXCEPTION","message":' + quotedMessage + ',"requestId":' + quotedRequestId + ',"contractVersion":"ae-bridge-response.v1","error":{"code":"AE_HOST_EXCEPTION","message":' + quotedMessage + ',"stage":"jsx-host","line":' + (errorLine === null || isNaN(errorLine) ? "null" : errorLine) + '}}';
    }
}
