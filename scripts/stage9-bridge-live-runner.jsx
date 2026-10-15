/* Stage 9 Bridge Live Runner - AE Boss Omega */
(function () {
  var diagLog = new File("D:/AE_BOSS_OMEGA_Foundation_v155_Deterministic_Consistency_Evidence_Quorum_Hardening/AE_BOSS_OMEGA_Foundation_v155/bridge/runner_diag.log");
  function log(msg) {
    try {
      diagLog.encoding = "UTF-8";
      diagLog.open("a");
      diagLog.writeln((new Date()).toString() + ": " + msg);
      diagLog.close();
    } catch (_) {}
  }

  log("Runner script started");

  function esc(s) {
    return (s + "").replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "");
  }

  function getISOString() {
    var d = new Date();
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    return d.getUTCFullYear() + '-' +
      pad(d.getUTCMonth() + 1) + '-' +
      pad(d.getUTCDate()) + 'T' +
      pad(d.getUTCHours()) + ':' +
      pad(d.getUTCMinutes()) + ':' +
      pad(d.getUTCSeconds()) + '.' +
      (d.getUTCMilliseconds() < 100 ? (d.getUTCMilliseconds() < 10 ? '00' : '0') : '') + d.getUTCMilliseconds() + 'Z';
  }

  function toJson(v) {
    if (v === null || v === undefined) return "null";
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    if (typeof v === "string") return '"' + esc(v) + '"';
    if (v instanceof Array) {
      var arrItems = [];
      for (var i = 0; i < v.length; i++) arrItems.push(toJson(v[i]));
      return "[" + arrItems.join(", ") + "]";
    }
    if (typeof v === "object") {
      var objItems = [];
      for (var k in v) {
        if (v.hasOwnProperty(k)) {
          objItems.push('"' + esc(k) + '": ' + toJson(v[k]));
        }
      }
      return "{" + objItems.join(", ") + "}";
    }
    return '""';
  }

  function readTextFile(path) {
    var f = new File(path);
    if (!f.exists) throw new Error("File not found: " + path);
    f.encoding = "UTF-8";
    f.open("r");
    var t = f.read();
    f.close();
    return t;
  }

  function writeTextFile(path, text) {
    var f = new File(path);
    f.encoding = "UTF-8";
    f.open("w");
    f.write(text);
    f.close();
  }

  function ensureFolder(folderPath) {
    var f = new Folder(folderPath);
    if (!f.exists) f.create();
    return f;
  }

  function findCompByName(name) {
    var p = app.project;
    if (!p) return null;
    for (var i = 1; i <= p.numItems; i++) {
      var it = p.item(i);
      if (it && (it instanceof CompItem) && it.name === name) return it;
    }
    return null;
  }

  function readbackAudit(auditSpec) {
    if (!auditSpec) return { ok: true, verified: false, note: "no audit requested" };

    var comp = findCompByName(auditSpec.comp);
    if (!comp) throw new Error("Audit: comp not found: " + auditSpec.comp);

    var layer = comp.layer(auditSpec.layer);
    if (!layer) throw new Error("Audit: layer not found: " + auditSpec.layer);

    var textVal = layer.property("Source Text").value.text;
    var posProp = layer.property("Position");
    var numKeys = posProp.numKeys;

    var keys = [];
    for (var k = 1; k <= numKeys; k++) {
      var v = posProp.keyValue(k);
      keys.push([v[0], v[1]]);
    }

    var expectedText = auditSpec.text;
    var expectedKeys = auditSpec.positionKeys;

    var textOk = (expectedText === undefined) ? true : (textVal === expectedText);

    var keysOk = true;
    if (expectedKeys && expectedKeys.length !== undefined) {
      keysOk = (numKeys === expectedKeys.length);
      if (keysOk) {
        for (var i = 0; i < expectedKeys.length; i++) {
          if (keys[i][0] !== expectedKeys[i][0] || keys[i][1] !== expectedKeys[i][1]) {
            keysOk = false;
            break;
          }
        }
      }
    }

    return {
      ok: true,
      comp: comp.name,
      layer: layer.name,
      sourceText: textVal,
      numKeys: numKeys,
      keys: keys,
      verified: (textOk && keysOk)
    };
  }

  var startedAt = (new Date()).getTime();
  var repoRoot = "D:/AE_BOSS_OMEGA_Foundation_v155_Deterministic_Consistency_Evidence_Quorum_Hardening/AE_BOSS_OMEGA_Foundation_v155";
  if (typeof $.fileName !== "undefined" && $.fileName) {
    var scriptFile = new File($.fileName);
    if (scriptFile.exists && scriptFile.parent && scriptFile.parent.parent) {
      repoRoot = scriptFile.parent.parent.fsName.replace(/\\/g, "/");
    }
  }

  log("repoRoot resolved to: " + repoRoot);

  var inboxPath = repoRoot + "/bridge/inbox/current.request.json";
  var outboxDir = repoRoot + "/bridge/outbox";
  var outboxPath = outboxDir + "/current.response.json";

  try {
    ensureFolder(outboxDir);

    var runtimePath = repoRoot + "/runtime/ae/bridge/ae-production-runtime.jsx";
    log("Evaluating runtime from: " + runtimePath);
    $.evalFile(runtimePath);
    if (!$.global.AEBossProductionRuntime) throw new Error("Runtime global missing: AEBossProductionRuntime");

    log("Reading inbox from: " + inboxPath);
    var raw = readTextFile(inboxPath);
    var req = eval("(" + raw + ")");

    if (!req || !req.jobId) throw new Error("Invalid bridge request (missing jobId)");
    log("Processing request for jobId: " + req.jobId);

    var stepResults = [];
    var errors = [];
    var outputFiles = [];

    for (var a = 0; a < req.actions.length; a++) {
      var action = req.actions[a];
      var actionStarted = (new Date()).getTime();

      try {
        if (action.type !== "bridge") {
          throw new Error("Unsupported action type in AE runner: " + action.type);
        }

        var params = action.params || {};
        var ops = params.ops;
        if (!ops || !ops.length) throw new Error("bridge action params.ops missing or empty");

        var opResults = [];
        for (var i = 0; i < ops.length; i++) {
          log("Applying op " + i + ": " + ops[i].type);
          var r = $.global.AEBossProductionRuntime.apply(ops[i]);
          opResults.push({ index: i, type: ops[i].type, result: r });
        }

        var audit = null;
        if (params.audit) {
          log("Running audit verification");
          audit = readbackAudit(params.audit);
        }

        for (var j = 0; j < ops.length; j++) {
          if (ops[j].type === "project.snapshot" && ops[j].path) {
            outputFiles.push(ops[j].path);
          }
        }

        stepResults.push({
          actionId: action.actionId || null,
          name: action.name || null,
          ok: true,
          durationMs: (new Date()).getTime() - actionStarted,
          opResults: opResults,
          audit: audit
        });

      } catch (inner) {
        log("Inner error on action: " + inner.toString());
        errors.push({
          actionId: action.actionId || null,
          error: inner.toString()
        });
        stepResults.push({
          actionId: action.actionId || null,
          name: action.name || null,
          ok: false,
          durationMs: (new Date()).getTime() - actionStarted,
          error: inner.toString()
        });
        break;
      }
    }

    var status = (errors.length === 0) ? "succeeded" : "failed";

    var response =
      "{\n" +
      '  "responseVersion": "1.0.0",\n' +
      '  "jobId": "' + esc(req.jobId) + '",\n' +
      '  "requestId": "' + esc(req.correlationId || "") + '",\n' +
      '  "status": "' + esc(status) + '",\n' +
      '  "completedAt": "' + esc(getISOString()) + '",\n' +
      '  "durationMs": ' + ((new Date()).getTime() - startedAt) + ",\n" +
      '  "stepResults": ' + toJson(stepResults) + ",\n" +
      '  "errors": ' + toJson(errors) + ",\n" +
      '  "outputFiles": ' + toJson(outputFiles) + "\n" +
      "}\n";

    log("Writing outbox response to: " + outboxPath);
    writeTextFile(outboxPath, response);
    log("Bridge execution completed with status: " + status);

  } catch (e) {
    log("Outer catch error: " + e.toString());
    var responseFail =
      "{\n" +
      '  "responseVersion": "1.0.0",\n' +
      '  "jobId": "job-stage9-bridge-e2e",\n' +
      '  "status": "failed",\n' +
      '  "completedAt": "' + esc(getISOString()) + '",\n' +
      '  "durationMs": ' + ((new Date()).getTime() - startedAt) + ",\n" +
      '  "errors": ["' + esc(e.toString()) + '"]\n' +
      "}\n";
    try { writeTextFile(outboxPath, responseFail); } catch (_) {}
  }
})();
