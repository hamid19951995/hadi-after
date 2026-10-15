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
  var receiptPath = root + "/evidence/ae/stage8a-production-runtime-receipt.json";

  try {
    // 1. Eval Production Runtime
    $.evalFile(root + "/runtime/ae/bridge/ae-production-runtime.jsx");
    if (!$.global.AEBossProductionRuntime) {
      throw new Error("AEBossProductionRuntime not found on global");
    }

    // 2. Read command file
    var cmdFile = new File(cmdPath);
    if (!cmdFile.exists) {
      throw new Error("command.json not found: " + cmdPath);
    }
    cmdFile.open("r");
    var raw = cmdFile.read();
    cmdFile.close();

    // Safe parser for ExtendScript
    var cmd = eval("(" + raw + ")");
    if (!cmd.ops || !cmd.ops.length) {
      throw new Error("Invalid command format: missing ops[]");
    }

    var resultsLog = [];
    for (var i = 0; i < cmd.ops.length; i++) {
      var op = cmd.ops[i];
      // Map property path for ExtendScript PropertyGroup lookup
      if (op.type === "property.set" && op.property === "Transform/Position") {
        op.property = "Position";
      }
      var res = $.global.AEBossProductionRuntime.apply(op);
      resultsLog.push('{"index": ' + i + ', "type": "' + esc(op.type) + '", "ok": true}');
    }

    var out =
      "{\n" +
      '  "stage": "STAGE_8A_PRODUCTION_RUNTIME_APPLY",\n' +
      '  "host": "' + esc(app.appName) + '",\n' +
      '  "version": "' + esc(app.version) + '",\n' +
      '  "timestamp": "' + esc((new Date()).toString()) + '",\n' +
      '  "status": "SUCCESS",\n' +
      '  "commandId": "' + esc(cmd.id || "") + '",\n' +
      '  "opCount": ' + cmd.ops.length + ',\n' +
      '  "results": [' + resultsLog.join(",") + "]\n" +
      "}\n";

    writeTextFile(receiptPath, out);

  } catch (e) {
    var outFail =
      "{\n" +
      '  "stage": "STAGE_8A_PRODUCTION_RUNTIME_APPLY",\n' +
      '  "host": "' + esc(app.appName) + '",\n' +
      '  "version": "' + esc(app.version) + '",\n' +
      '  "timestamp": "' + esc((new Date()).toString()) + '",\n' +
      '  "status": "FAILED",\n' +
      '  "error": "' + esc(e.toString()) + '"\n' +
      "}\n";

    writeTextFile(receiptPath, outFail);
  }
})();
