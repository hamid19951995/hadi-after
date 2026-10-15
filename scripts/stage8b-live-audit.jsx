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
  var receiptPath = root + "/evidence/ae/stage8b-live-audit-receipt.json";
  var saveAepPath = root + "/evidence/ae/stage8b_verified.aep";

  try {
    // 1. Load production runtime
    $.evalFile(root + "/runtime/ae/bridge/ae-production-runtime.jsx");
    if (!$.global.AEBossProductionRuntime) {
      throw new Error("AEBossProductionRuntime not found on global");
    }

    // 2. Read command
    var cmdFile = new File(cmdPath);
    if (!cmdFile.exists) throw new Error("command.json not found: " + cmdPath);
    cmdFile.open("r");
    var raw = cmdFile.read();
    cmdFile.close();

    var cmd = eval("(" + raw + ")");
    if (!cmd.ops || !cmd.ops.length) throw new Error("Invalid command format: missing ops[]");

    // 3. Apply operations via runtime
    var opsLog = [];
    for (var i = 0; i < cmd.ops.length; i++) {
      var op = cmd.ops[i];
      if (op.type === "property.set" && op.property === "Transform/Position") {
        op.property = "Position";
      }
      var res = $.global.AEBossProductionRuntime.apply(op);
      opsLog.push('{"index": ' + i + ', "type": "' + esc(op.type) + '", "ok": true}');
    }

    // 4. Perform In-Session Semantic Readback Audit
    if (!app.project) throw new Error("No active project");

    var targetComp = null;
    for (var c = 1; c <= app.project.numItems; c++) {
      var item = app.project.item(c);
      if (item instanceof CompItem && item.name === "STAGE8A_COMP") {
        targetComp = item;
        break;
      }
    }
    if (!targetComp) throw new Error("Semantic Audit: Comp STAGE8A_COMP was not created in project");

    var targetLayer = null;
    for (var l = 1; l <= targetComp.numLayers; l++) {
      var lyr = targetComp.layer(l);
      if (lyr.name === "Stage8A_Solid") {
        targetLayer = lyr;
        break;
      }
    }
    if (!targetLayer) throw new Error("Semantic Audit: Layer Stage8A_Solid not found in comp");

    var pos = targetLayer.property("Position").value;
    var isPositionMatch = (Math.abs(pos[0] - 960) < 0.001) && (Math.abs(pos[1] - 540) < 0.001);

    // 5. Save project to evidence folder
    var aepFile = new File(saveAepPath);
    app.project.save(aepFile);

    var out =
      "{\n" +
      '  "stage": "STAGE_8B_SEMANTIC_AUDIT",\n' +
      '  "host": "' + esc(app.appName) + '",\n' +
      '  "version": "' + esc(app.version) + '",\n' +
      '  "timestamp": "' + esc((new Date()).toString()) + '",\n' +
      '  "status": "SUCCESS",\n' +
      '  "audit": {\n' +
      '    "commandId": "' + esc(cmd.id || "") + '",\n' +
      '    "opsApplied": ' + cmd.ops.length + ',\n' +
      '    "compName": "' + esc(targetComp.name) + '",\n' +
      '    "compWidth": ' + targetComp.width + ',\n' +
      '    "compHeight": ' + targetComp.height + ',\n' +
      '    "layerName": "' + esc(targetLayer.name) + '",\n' +
      '    "position": [' + pos[0] + ', ' + pos[1] + "],\n" +
      '    "positionVerified": ' + (isPositionMatch ? "true" : "false") + ",\n" +
      '    "projectSaved": "' + esc(aepFile.fsName) + '"\n' +
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
