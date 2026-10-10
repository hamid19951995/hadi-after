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
                    var opacityProperty = transformGroup && transformGroup.property("ADBE Opacity");
                    layerInfo.keyframes = { position: positionProperty ? positionProperty.numKeys : 0, opacity: opacityProperty ? opacityProperty.numKeys : 0 };
                } catch (keyframeError) { layerInfo.keyframes = { position: 0, opacity: 0 }; }
                try {
                    if (layer.property("Source Text")) layerInfo.text = layer.property("Source Text").value.text;
                } catch (textError) { }
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
            var queueInfo = { index: queueIndex, status: String(queueItem.status), composition: queueItem.comp ? queueItem.comp.name : null, outputModules: [] };
            try {
                for (var outputIndex = 1; outputIndex <= queueItem.numOutputModules; outputIndex++) {
                    var outputModule = queueItem.outputModule(outputIndex);
                    queueInfo.outputModules.push({ file: outputModule.file ? outputModule.file.fsName : null, template: outputModule.name });
                }
            } catch (queueOutputError) { }
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
    if (!project) return { ok: false, message: "No project is open.", issues: [] };
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
        return { ok: true, message: "Render Queue completed." };
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
    var result;
    var requestId = payload && payload.requestId ? String(payload.requestId) : null;
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
    if (result && typeof result === "object") {
        result.requestId = requestId;
        result.contractVersion = "ae-bridge-response.v1";
        if (result.ok === false) result.error = { code: result.code || "HOST_COMMAND_FAILED", message: result.message || "Host command failed.", stage: "jsx-host" };
    }
    return JSON.stringify(result);
}
