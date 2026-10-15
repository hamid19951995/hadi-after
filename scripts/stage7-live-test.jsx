(function () {
    var evidenceDir = new Folder("D:/AE_BOSS_OMEGA_Foundation_v155_Deterministic_Consistency_Evidence_Quorum_Hardening/AE_BOSS_OMEGA_Foundation_v155/evidence/ae");
    if (!evidenceDir.exists) {
        evidenceDir.create();
    }
    var outFile = new File("D:/AE_BOSS_OMEGA_Foundation_v155_Deterministic_Consistency_Evidence_Quorum_Hardening/AE_BOSS_OMEGA_Foundation_v155/evidence/ae/stage7-live-host-receipt.json");

    function saveReceipt(status, verified, errMsg, readback) {
        try {
            outFile.open("w");
            var out = "{\n" +
                '  "stage": "STAGE_7_LIVE_HOST_TEXT",\n' +
                '  "host": "' + app.appName + '",\n' +
                '  "version": "' + app.version + '",\n' +
                '  "timestamp": "' + (new Date()).toString() + '",\n' +
                '  "status": "' + status + '",\n' +
                '  "verified": ' + (verified ? "true" : "false") + ',\n' +
                '  "error": "' + (errMsg ? errMsg.replace(/\\/g, "\\\\").replace(/"/g, '\\"') : "") + '",\n' +
                '  "readback": {\n' +
                '    "compName": "' + (readback && readback.compName ? readback.compName : "") + '",\n' +
                '    "layerCount": ' + (readback ? readback.layerCount : 0) + ',\n' +
                '    "textLayerName": "' + (readback && readback.textLayerName ? readback.textLayerName : "") + '",\n' +
                '    "textSourceText": "' + (readback && readback.textSourceText ? readback.textSourceText.replace(/"/g, '\\"') : "") + '",\n' +
                '    "keyframeCount": ' + (readback ? readback.keyframeCount : 0) + '\n' +
                '  }\n' +
                "}";
            outFile.write(out);
            outFile.close();
        } catch (inner) {}
    }

    try {
        if (!app.project) {
            app.newProject();
        }

        // 1. Create comp
        var comp = app.project.items.addComp("STAGE7_TEXT_VERIFICATION", 1920, 1080, 1, 5, 30);
        if (!comp) throw new Error("Failed to create comp");

        // 2. Create text layer
        var txtLayer = comp.layers.addText("INITIAL_TEXT");
        if (!txtLayer) throw new Error("Failed to add text layer");

        // 3. Set text document source safely
        var textProp = txtLayer.property("Source Text");
        var textDoc = textProp.value;
        textDoc.text = "STAGE7_VERIFIED_TEXT";
        textProp.setValue(textDoc);

        // 4. Add position keyframes
        var posProp = txtLayer.property("Transform").property("Position");
        posProp.setValueAtTime(0, [400, 540]);
        posProp.setValueAtTime(2, [1500, 540]);
        posProp.setValueAtTime(4, [960, 540]);

        // 5. Semantic readback directly from project items
        var foundComp = null;
        for (var i = 1; i <= app.project.numItems; i++) {
            if (app.project.item(i) instanceof CompItem && app.project.item(i).name === "STAGE7_TEXT_VERIFICATION") {
                foundComp = app.project.item(i);
                break;
            }
        }
        if (!foundComp) throw new Error("Readback failed: comp not found in project items");

        var textLayerReadback = null;
        for (var j = 1; j <= foundComp.numLayers; j++) {
            if (foundComp.layer(j) instanceof TextLayer) {
                textLayerReadback = foundComp.layer(j);
                break;
            }
        }
        if (!textLayerReadback) throw new Error("Readback failed: TextLayer not found in comp");

        var readText = textLayerReadback.property("Source Text").value.text;
        var keysCount = textLayerReadback.property("Transform").property("Position").numKeys;

        var isVerified = (readText === "STAGE7_VERIFIED_TEXT" && keysCount === 3 && foundComp.numLayers >= 1);

        saveReceipt("SUCCESS", isVerified, "", {
            compName: foundComp.name,
            layerCount: foundComp.numLayers,
            textLayerName: textLayerReadback.name,
            textSourceText: readText,
            keyframeCount: keysCount
        });

    } catch (err) {
        saveReceipt("FAILED", false, err.toString(), null);
    }
})();
