(function () {
  function esc(s) {
    return (s + "").replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "");
  }

  function writeTextFile(path, text) {
    var f = new File(path);
    f.encoding = "UTF-8";
    f.open("w");
    f.write(text);
    f.close();
  }

  var root = "D:/AE_BOSS_OMEGA_Foundation_v155_Deterministic_Consistency_Evidence_Quorum_Hardening/AE_BOSS_OMEGA_Foundation_v155";
  var receiptPath = root + "/evidence/ae/stage8b-live-audit-receipt.json";

  try {
    if (!app.project) throw new Error("No active project");

    var targetComp = null;
    for (var i = 1; i <= app.project.numItems; i++) {
      var item = app.project.item(i);
      if (item instanceof CompItem && item.name === "STAGE8A_COMP") {
        targetComp = item;
        break;
      }
    }

    if (!targetComp) throw new Error("Comp STAGE8A_COMP not found in project");

    var targetLayer = null;
    for (var j = 1; j <= targetComp.numLayers; j++) {
      var l = targetComp.layer(j);
      if (l.name === "Stage8A_Solid") {
        targetLayer = l;
        break;
      }
    }

    if (!targetLayer) throw new Error("Layer Stage8A_Solid not found in comp");

    var pos = targetLayer.property("Position").value;

    var out =
      "{\n" +
      '  "stage": "STAGE_8B_SEMANTIC_AUDIT",\n' +
      '  "host": "' + esc(app.appName) + '",\n' +
      '  "version": "' + esc(app.version) + '",\n' +
      '  "timestamp": "' + esc((new Date()).toString()) + '",\n' +
      '  "status": "SUCCESS",\n' +
      '  "audit": {\n' +
      '    "compFound": true,\n' +
      '    "compName": "' + esc(targetComp.name) + '",\n' +
      '    "layerFound": true,\n' +
      '    "layerName": "' + esc(targetLayer.name) + '",\n' +
      '    "position": [' + pos[0] + ', ' + pos[1] + "]\n" +
      '  }\n' +
      "}\n";

    writeTextFile(receiptPath, out);

  } catch (e) {
    var outFail =
      "{\n" +
      '  "stage": "STAGE_8B_SEMANTIC_AUDIT",\n' +
      '  "host": "' + esc(app.appName) + '",\n' +
      '  "version": "' + esc(app.version) + '",\n' +
      '  "timestamp": "' + esc((new Date()).toString()) + '",\n' +
      '  "status": "FAILED",\n' +
      '  "error": "' + esc(e.toString()) + '"\n' +
      "}\n";
    writeTextFile(receiptPath, outFail);
  }
})();
