/* Stage 11 AE Bridge Batch Runner (LIVE, robust JSON fallback)
   - Reads:  bridge/inbox/current.request.json
   - Writes: bridge/outbox/current.response.json
   - Creates: bridge/ready/ae.ready
*/
(function() {
  var scriptFile = new File($.fileName);
  var repoRootFolder = scriptFile.parent.parent;
  var repoRoot = repoRootFolder.fsName;

  function toAbsPath(relOrAbs) {
    if (!relOrAbs) return "";
    var s = String(relOrAbs).replace(/\\/g, "/");
    if (/^[A-Za-z]:\//.test(s) || s.indexOf("/") === 0) {
      return (new File(s)).fsName;
    }
    return (new File(repoRoot + "/" + s)).fsName;
  }

  function nowIso() {
    try {
      var d = new Date();
      function pad(n) { return (n < 10 ? "0" : "") + n; }
      var ms = d.getUTCMilliseconds();
      var msText = ms < 10 ? "00" : (ms < 100 ? "0" : "");
      return d.getUTCFullYear() + "-" +
             pad(d.getUTCMonth() + 1) + "-" +
             pad(d.getUTCDate()) + "T" +
             pad(d.getUTCHours()) + ":" +
             pad(d.getUTCMinutes()) + ":" +
             pad(d.getUTCSeconds()) + "." +
             msText + ms + "Z";
    } catch (e) {
      return String(new Date());
    }
  }

  function toJsonString(obj) {
    if (obj === null) return "null";
    if (obj === undefined) return "undefined";
    var t = typeof obj;
    if (t === "number" || t === "boolean") return String(obj);
    if (t === "string") {
      var s = obj.replace(/\\/g, "\\\\")
                 .replace(/"/g, '\\"')
                 .replace(/\n/g, "\\n")
                 .replace(/\r/g, "\\r")
                 .replace(/\t/g, "\\t");
      return '"' + s + '"';
    }
    if (obj instanceof Array) {
      var arr = [];
      for (var i = 0; i < obj.length; i++) {
        arr.push(toJsonString(obj[i]));
      }
      return "[" + arr.join(",") + "]";
    }
    if (t === "object") {
      var pairs = [];
      for (var k in obj) {
        if (obj.hasOwnProperty(k)) {
          pairs.push('"' + k + '":' + toJsonString(obj[k]));
        }
      }
      return "{" + pairs.join(",") + "}";
    }
    return '""';
  }

  function ensureFolderForFile(absFilePath) {
    var file = new File(absFilePath);
    var folder = file.parent;
    if (folder && !folder.exists) folder.create();
  }

  function readTextFile(fileObj) {
    fileObj.encoding = "UTF-8";
    if (!fileObj.exists) return null;
    if (!fileObj.open("r")) return null;
    var txt = fileObj.read();
    fileObj.close();
    return txt;
  }

  function writeTextFileAtomic(finalPath, text) {
    var finalFile = new File(finalPath);
    ensureFolderForFile(finalPath);

    var tmpPath = finalPath + "." + (new Date()).getTime() + ".tmp";
    var tmpFile = new File(tmpPath);
    tmpFile.encoding = "UTF-8";
    if (!tmpFile.open("w")) throw new Error("Cannot open tmp for write: " + tmpPath);
    tmpFile.write(text);
    tmpFile.close();

    try { if (finalFile.exists) finalFile.remove(); } catch (e) {}
    tmpFile.rename(finalFile.name);
  }

  function normalizePath(p) { return String(p).replace(/\\/g, "/"); }

  function findCompByName(compName) {
    if (!app.project) return null;
    var items = app.project.items;
    if (!items) return null;
    for (var i = 1; i <= items.length; i++) {
      var it = items[i];
      if (it && it instanceof CompItem && it.name === compName) return it;
    }
    return null;
  }

  function createFallbackComp(compName) {
    if (!app.project) app.newProject();

    var width = 1920, height = 1080, pixelAspect = 1.0, duration = 1.0, fps = 30.0;
    var comp = app.project.items.addComp(compName, width, height, pixelAspect, duration, fps);

    try {
      var solid = comp.layers.addSolid([0.1, 0.1, 0.1], "BG", width, height, pixelAspect, duration);
      solid.threeDLayer = false;
    } catch (e) {}

    try {
      var txt = comp.layers.addText(compName);
      txt.name = "LABEL_" + compName;
    } catch (e) {}

    return comp;
  }

  function ensureComp(compName) {
    var comp = findCompByName(compName);
    if (comp) return { comp: comp, created: false };
    return { comp: createFallbackComp(compName), created: true };
  }

  function setRQMp4Output(rqItem, outFile) {
    var om = rqItem.outputModule(1);
    var tried = false;
    try { om.applyTemplate("H.264"); tried = true; } catch (e) {}
    if (!tried) { try { om.applyTemplate("H264"); tried = true; } catch (e2) {} }
    if (!tried) { try { om.applyTemplate("Match Source - High bitrate"); tried = true; } catch (e3) {} }
    om.file = outFile;
  }

  function fileSizeBytes(absPath) {
    var f = new File(absPath);
    if (!f.exists) return 0;
    try { return f.length; } catch (e) { return 0; }
  }

  function touchReadyFile() {
    try {
      var readyDir = new Folder(repoRoot + "/bridge/ready");
      if (!readyDir.exists) readyDir.create();
      var readyFile = new File(repoRoot + "/bridge/ready/ae.ready");
      readyFile.encoding = "UTF-8";
      if (readyFile.open("w")) {
        readyFile.write("{\"ts\":\"" + nowIso() + "\"}");
        readyFile.close();
      }
    } catch (e) {}
  }

  // --- main ---
  var inboxPath = toAbsPath("bridge/inbox/current.request.json");
  var outboxPath = toAbsPath("bridge/outbox/current.response.json");

  var request = null;
  var response = {
    responseVersion: "1.0.0",
    jobId: "unknown",
    requestId: null,
    status: "failed",
    completedAt: null,
    durationMs: null,
    stepResults: [],
    errors: [],
    outputFiles: []
  };

  var startedAtMs = (new Date()).getTime();

  try {
    var inbox = new File(inboxPath);
    var raw = readTextFile(inbox);
    if (!raw) throw new Error("Inbox request missing or unreadable: " + inboxPath);

    try {
      request = (typeof JSON !== "undefined" && JSON.parse) ? JSON.parse(raw) : eval("(" + raw + ")");
    } catch (e) {
      throw new Error("Invalid JSON in request: " + String(e));
    }

    response.jobId = request && request.jobId ? request.jobId : "unknown";
    response.requestId = request && request.requestId ? request.requestId : null;

    touchReadyFile();

    if (!request.actions || !request.actions.length) throw new Error("Request has no actions");

    var act = request.actions[0];
    var actionId = act.actionId || act.name || "action-1";
    var params = act.params || {};

    var compName = params.compName || params.composition || params.comp || null;
    var outputPath = params.outputPath || null;

    if (!compName) throw new Error("Missing compName in action params for " + actionId);
    if (!outputPath) throw new Error("Missing outputPath in action params for " + actionId);

    var outAbs = toAbsPath(outputPath);

    app.beginUndoGroup("Stage11-Live-Bridge");

    if (!app.project) app.newProject();

    var ensured = ensureComp(compName);
    var comp = ensured.comp;

    try {
      while (app.project.renderQueue.numItems > 0) {
        app.project.renderQueue.item(1).remove();
      }
    } catch (e) {}

    var rqItem = app.project.renderQueue.items.add(comp);
    rqItem.timeSpanStart = 0;
    rqItem.timeSpanDuration = comp.duration;

    var outFile = new File(outAbs);
    ensureFolderForFile(outAbs);
    setRQMp4Output(rqItem, outFile);

    app.project.renderQueue.render();

    app.endUndoGroup();

    var sz = fileSizeBytes(outAbs);
    if (sz <= 0) throw new Error("Render produced no output or zero-byte file: " + outAbs);

    response.status = "succeeded";
    response.stepResults.push({
      step: actionId,
      status: "succeeded",
      details: (ensured.created ? "Rendered (fallback comp created): " : "Rendered: ") + compName
    });

    response.outputFiles.push({
      path: normalizePath(outputPath),
      absolutePath: normalizePath(outAbs),
      bytes: sz
    });

  } catch (err) {
    response.status = "failed";
    response.errors.push({ message: String(err), ts: nowIso() });
    try { app.endUndoGroup(); } catch (e) {}
  } finally {
    response.completedAt = nowIso();
    try {
      var endedAtMs = (new Date()).getTime();
      response.durationMs = endedAtMs - startedAtMs;
    } catch (e) {
      response.durationMs = null;
    }

    var respStr = "";
    try {
      if (typeof JSON !== "undefined" && JSON.stringify) {
        respStr = JSON.stringify(response, null, 2);
      } else {
        respStr = toJsonString(response);
      }
    } catch (eJson) {
      respStr = toJsonString(response);
    }

    try {
      writeTextFileAtomic(outboxPath, respStr);
    } catch (e2) {
      try {
        var errFile = new File(outboxPath);
        errFile.encoding = "UTF-8";
        if (errFile.open("w")) {
          errFile.write('{"responseVersion":"1.0.0","jobId":"' + response.jobId + '","status":"failed","error":"Failed write: ' + String(e2) + '"}');
          errFile.close();
        }
      } catch (e3) {}
    }
  }
})();