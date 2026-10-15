(function () {
    try {
        // Load production runtime
        var runtimeFile = new File("D:/AE_BOSS_OMEGA_Foundation_v155_Deterministic_Consistency_Evidence_Quorum_Hardening/AE_BOSS_OMEGA_Foundation_v155/runtime/ae/bridge/ae-production-runtime.jsx");
        if (!runtimeFile.exists) {
            throw new Error("Runtime file not found: " + runtimeFile.fsName);
        }
        $.evalFile(runtimeFile.fsName);

        if (!$.global.AEBossProductionRuntime) {
            throw new Error("AEBossProductionRuntime failed to initialize");
        }

        var runtime = $.global.AEBossProductionRuntime;

        // 1. Create a live composition
        var compRes = runtime.apply({
            type: "comp.create",
            name: "STAGE6_LIVE_VERIFICATION",
            width: 1920,
            height: 1080,
            duration: 5,
            frameRate: 30
        });

        // 2. Add a Solid Layer
        var solidRes = runtime.apply({
            type: "layer.addSolid",
            comp: "STAGE6_LIVE_VERIFICATION",
            name: "LiveAudit_Layer",
            color: [0.1, 0.5, 0.9]
        });

        // 3. Readback Verification from Host Application
        var proj = app.project;
        var foundComp = null;
        for (var i = 1; i <= proj.numItems; i++) {
            if (proj.item(i) instanceof CompItem && proj.item(i).name === "STAGE6_LIVE_VERIFICATION") {
                foundComp = proj.item(i);
                break;
            }
        }

        var verified = (foundComp !== null && foundComp.numLayers >= 1);

        var receipt = {
            stage: "STAGE_6_LIVE_HOST",
            host: app.appName,
            version: app.version,
            isoTimestamp: new Date().toISOString ? new Date().toISOString() : (new Date().toString()),
            status: "SUCCESS",
            verified: verified,
            operations: [
                { type: "comp.create", result: compRes },
                { type: "layer.addSolid", result: solidRes }
            ],
            readback: {
                compName: foundComp ? foundComp.name : null,
                layerCount: foundComp ? foundComp.numLayers : 0,
                firstLayerName: (foundComp && foundComp.numLayers >= 1) ? foundComp.layer(1).name : null
            }
        };

        // Ensure evidence folder exists and write receipt
        var evidenceFolder = new Folder("D:/AE_BOSS_OMEGA_Foundation_v155_Deterministic_Consistency_Evidence_Quorum_Hardening/AE_BOSS_OMEGA_Foundation_v155/evidence/ae");
        if (!evidenceFolder.exists) {
            evidenceFolder.create();
        }

        var outFile = new File("D:/AE_BOSS_OMEGA_Foundation_v155_Deterministic_Consistency_Evidence_Quorum_Hardening/AE_BOSS_OMEGA_Foundation_v155/evidence/ae/stage6-live-host-receipt.json");
        outFile.open("w");
        // Simple manual JSON serialization for ExtendScript
        outFile.write(
            '{\n' +
            '  "stage": "' + receipt.stage + '",\n' +
            '  "host": "' + receipt.host + '",\n' +
            '  "version": "' + receipt.version + '",\n' +
            '  "timestamp": "' + receipt.isoTimestamp + '",\n' +
            '  "status": "' + receipt.status + '",\n' +
            '  "verified": ' + (receipt.verified ? 'true' : 'false') + ',\n' +
            '  "readback": {\n' +
            '    "compName": "' + (receipt.readback.compName || "") + '",\n' +
            '    "layerCount": ' + receipt.readback.layerCount + ',\n' +
            '    "firstLayerName": "' + (receipt.readback.firstLayerName || "") + '"\n' +
            '  }\n' +
            '}'
        );
        outFile.close();

    } catch (e) {
        var errFile = new File("D:/AE_BOSS_OMEGA_Foundation_v155_Deterministic_Consistency_Evidence_Quorum_Hardening/AE_BOSS_OMEGA_Foundation_v155/evidence/ae/stage6-live-host-receipt.json");
        errFile.open("w");
        errFile.write('{\n  "stage": "STAGE_6_LIVE_HOST",\n  "status": "FAILED",\n  "error": "' + e.toString().replace(/"/g, '\\"') + '"\n}');
        errFile.close();
    }
})();
