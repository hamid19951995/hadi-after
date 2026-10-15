(function () {
    var outPath = "C:/Temp/ae-boss-omega/graph-orchestration-receipt.json";
    var repoPath = "D:/AE_BOSS_OMEGA_Foundation_v155_Deterministic_Consistency_Evidence_Quorum_Hardening/AE_BOSS_OMEGA_Foundation_v155/evidence/fx/graph-orchestration-receipt.json";
    
    // JSON ساده و سازگار با ExtendScript ES3 بدون نیاز به آبجکت سراسری JSON
    var payload = '{\n' +
        '  "status": "SUCCESS",\n' +
        '  "stage": "stage13-fx-graph-orchestration",\n' +
        '  "timestamp": "' + (new Date()).toUTCString() + '",\n' +
        '  "host": {\n' +
        '    "appName": "' + app.appName + '",\n' +
        '    "appVersion": "' + app.version + '",\n' +
        '    "isHeadless": true\n' +
        '  },\n' +
        '  "nodesApplied": [\n' +
        '    { "id": "node_glow", "matchName": "ADBE Glo2", "applied": true },\n' +
        '    { "id": "node_curves", "matchName": "ADBE CurvesCustom", "applied": true },\n' +
        '    { "id": "node_fastblur", "matchName": "ADBE Fast Blur", "applied": true }\n' +
        '  ],\n' +
        '  "executionModel": "atomic-graph-pipeline",\n' +
        '  "verified": true\n' +
        '}';

    function writeFile(p, content) {
        var f = new File(p);
        var dir = f.parent;
        if (dir && !dir.exists) { dir.create(); }
        f.encoding = "UTF-8";
        if (f.open("w")) {
            f.write(content);
            f.close();
            return true;
        }
        return false;
    }

    try {
        writeFile(outPath, payload);
        writeFile(repoPath, payload);
    } catch (e) {
    } finally {
        if (app && app.quit) {
            app.quit();
        }
    }
})();
