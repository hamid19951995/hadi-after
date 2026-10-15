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
  var cmdPath = root + "/.exchange/ae/command.json";
  var receiptPath = root + "/evidence/ae/stage8c-live-receipt.json";
  var saveAepPath = root + "/evidence/ae/stage8c_verified.aep";

  try {
    $.evalFile(root + "/runtime/ae/bridge/ae-production-runtime.jsx");
    if (!$.global.AEBossProductionRuntime) throw new Error("Runtime global missing");

    var cmdFile = new File(cmdPath);
    cmdFile.open("r");
    var raw = cmdFile.read();
    cmdFile.close();
    var cmd = eval("(" + raw + ")");

    var results = [];
    for (var i = 0; i < cmd.ops.length; i++) {
      var r = $.global.AEBossProductionRuntime.apply(cmd.ops[i]);
      results.push('{"index": ' + i + ', "type": "' + esc(cmd.ops[i].type) + '", "ok": true}');
    }

    // Semantic readback
    var comp = null;
    for (var c = 1; c <= app.project.numItems; c++) {
      if (app.project.item(c).name === "STAGE8C_TITLES") {
        comp = app.project.item(c);
        break;
      }
    }
    if (!comp) throw new Error("Comp STAGE8C_TITLES not found");

    var layer = comp.layer("TitleLayer");
    if (!layer) throw new Error("TitleLayer not found");

    var textVal = layer.property("Source Text").value.text;
    var posProp = layer.property("Position");
    var kfCount = posProp.numKeys;
    var kf1 = posProp.keyValue(1);
    var kf2 = posProp.keyValue(2);
    var kf3 = posProp.keyValue(3);

    var aep = new File(saveAepPath);
    app.project.save(aep);

    var out =
      "{\n" +
      '  "stage": "STAGE_8C_ADVANCED_RUNTIME",\n' +
      '  "host": "' + esc(app.appName) + '",\n' +
      '  "version": "' + esc(app.version) + '",\n' +
      '  "timestamp": "' + esc((new Date()).toString()) + '",\n' +
      '  "status": "SUCCESS",\n' +
      '  "audit": {\n' +
      '    "comp": "' + esc(comp.name) + '",\n' +
      '    "layer": "' + esc(layer.name) + '",\n' +
      '    "sourceText": "' + esc(textVal) + '",\n' +
      '    "numKeys": ' + kfCount + ',\n' +
      '    "key1": [' + kf1[0] + ', ' + kf1[1] + "],\n" +
      '    "key2": [' + kf2[0] + ', ' + kf2[1] + "],\n" +
      '    "key3": [' + kf3[0] + ', ' + kf3[1] + "],\n" +
      '    "verified": ' + (kfCount === 3 && textVal === "AE BOSS OMEGA LIVE" ? "true" : "false") + ",\n" +
      '    "savedAep": "' + esc(aep.fsName) + '"\n' +
      '  }\n' +
      "}\n";

    writeTextFile(receiptPath, out);

  } catch (e) {
    var outFail =
      "{\n" +
      '  "stage": "STAGE_8C_ADVANCED_RUNTIME",\n' +
      '  "host": "' + esc(app.appName) + '",\n' +
      '  "version": "' + esc(app.version) + '",\n' +
      '  "timestamp": "' + esc((new Date()).toString()) + '",\n' +
      '  "status": "FAILED",\n' +
      '  "error": "' + esc(e.toString()) + '"\n' +
      "}\n";
    writeTextFile(receiptPath, outFail);
  }
})();
