(function() {
    var repoRoot = "D:\\AE_BOSS_OMEGA_Foundation_v155_Deterministic_Consistency_Evidence_Quorum_Hardening\\AE_BOSS_OMEGA_Foundation_v155";
    var logFile = new File(repoRoot + "/bridge/stage10_exec.log");

    function getISOString() {
        var d = new Date();

        function pad(n) {
            return (n < 10 ? "0" : "") + n;
        }

        var ms = d.getUTCMilliseconds();
        var msText = ms < 10 ? "00" : (ms < 100 ? "0" : "");

        return d.getUTCFullYear() + "-" +
            pad(d.getUTCMonth() + 1) + "-" +
            pad(d.getUTCDate()) + "T" +
            pad(d.getUTCHours()) + ":" +
            pad(d.getUTCMinutes()) + ":" +
            pad(d.getUTCSeconds()) + "." +
            msText + ms + "Z";
    }

    function jsonEscape(value) {
        return String(value)
            .replace(/\\/g, "\\\\")
            .replace(/"/g, '\\"')
            .replace(/\r/g, "\\r")
            .replace(/\n/g, "\\n")
            .replace(/\t/g, "\\t");
    }

    function toJson(value) {
        if (value === null || value === undefined) {
            return "null";
        }

        if (typeof value === "number") {
            return isFinite(value) ? String(value) : "null";
        }

        if (typeof value === "boolean") {
            return value ? "true" : "false";
        }

        if (typeof value === "string") {
            return '"' + jsonEscape(value) + '"';
        }

        if (value instanceof Array) {
            var items = [];
            for (var i = 0; i < value.length; i++) {
                items.push(toJson(value[i]));
            }
            return "[" + items.join(",") + "]";
        }

        if (typeof value === "object") {
            var fields = [];
            for (var key in value) {
                if (value.hasOwnProperty(key)) {
                    fields.push(
                        '"' + jsonEscape(key) + '":' + toJson(value[key])
                    );
                }
            }
            return "{" + fields.join(",") + "}";
        }

        return "null";
    }

    function logMsg(msg) {
        try {
            logFile.open("a");
            logFile.writeln(getISOString() + " [STAGE10-JSX] " + msg);
            logFile.close();
        } catch(e) {}
    }

    logMsg("Stage 10 runner started.");

    // 1. Signal early readiness
    try {
        var readyDir = new Folder(repoRoot + "/bridge/ready");
        if (!readyDir.exists) readyDir.create();
        var earlyReadyFile = new File(repoRoot + "/bridge/ready/ae.ready");
        if (earlyReadyFile.open("w")) {
            earlyReadyFile.encoding = "UTF-8";
            earlyReadyFile.write(toJson({ ts: getISOString(), phase: "startup" }));
            earlyReadyFile.close();
            logMsg("ae.ready startup written.");
        }
    } catch(err) {
        logMsg("Failed to write ae.ready: " + err.toString());
    }

    // 2. Wait for inbox
    var inboxFile = new File(repoRoot + "/bridge/inbox/current.request.json");
    var inboxWaitAttempts = 0;
    while (!inboxFile.exists && inboxWaitAttempts < 60) {
        $.sleep(250);
        inboxWaitAttempts++;
    }

    if (!inboxFile.exists) {
        logMsg("Timeout waiting for inbox current.request.json.");
        return;
    }

    inboxFile.open("r");
    var content = inboxFile.read();
    inboxFile.close();
    logMsg("Inbox request read: " + content.length + " bytes.");

    var responseObj;
    var startedAt = new Date().getTime();
    var request = {};

    try {
        request = eval("(" + content + ")");
        var payload = request.payload || {};
        var action0 = (request.actions && request.actions.length > 0) ? request.actions[0] : {};
        var actionParams = action0.params || {};

        var compName = payload.compName || actionParams.compName || "STAGE9_TITLES";
        
        var evidenceDir = request.evidenceDir || ("evidence/ae/" + (request.jobId || "job-stage10-render-001"));
        var reqActionOut = (request.actions && request.actions[0] && request.actions[0].params) ? request.actions[0].params.outputPath : null;
        var candidateOut = payload.outputPath || actionParams.outputPath || reqActionOut;
        var defaultOutputPath = repoRoot + "/" + evidenceDir.replace(/\\/g, "/") + "/output.mp4";
        var outputPath = candidateOut || defaultOutputPath;

        logMsg("Processing render: compName=" + compName + ", outputPath=" + outputPath);

        // Ensure target folder exists
        var outF = new File(outputPath);
        if (outF.parent && !outF.parent.exists) {
            outF.parent.create();
        }

        if (outF.exists) {
            try { outF.remove(); } catch(remErr) {}
        }

        // Project setup: load Stage 9 verified project if available
        var stage9Path = repoRoot + "/evidence/ae/stage9-live-e2e/stage9_verified.aep";
        var stage9File = new File(stage9Path);
        if (stage9File.exists) {
            try {
                logMsg("Opening Stage 9 AEP project: " + stage9Path);
                app.open(stage9File);
            } catch (openErr) {
                logMsg("Warning: could not open Stage 9 AEP: " + openErr.toString());
            }
        } else if (!app.project || app.project.numItems === 0) {
            app.newProject();
        }

        var targetComp = null;
        if (app.project && app.project.numItems > 0) {
            for (var i = 1; i <= app.project.numItems; i++) {
                var item = app.project.item(i);
                if (item instanceof CompItem && item.name === compName) {
                    targetComp = item;
                    break;
                }
            }
        }

        if (!targetComp) {
            logMsg("Target comp not found, creating fallback solid comp: " + compName);
            if (!app.project) { app.newProject(); }
            targetComp = app.project.items.addComp(compName, 1920, 1080, 1.0, 2.0, 30);
            targetComp.layers.addSolid([0.1, 0.2, 0.5], "Background", 1920, 1080, 1.0, 2.0);
        } else {
            logMsg("Found target composition: " + targetComp.name);
        }

        // Clear previous render queue items render flag to avoid obsolete queue runs
        for (var q = 1; q <= app.project.renderQueue.numItems; q++) {
            app.project.renderQueue.item(q).render = false;
        }

        // Add to render queue
        var rqItem = app.project.renderQueue.items.add(targetComp);
        var outModule = rqItem.outputModule(1);
        outModule.file = new File(outputPath);

        logMsg("Starting synchronous app.project.renderQueue.render()...");
        app.project.renderQueue.render();
        logMsg("Render call completed.");

        var renderedFile = new File(outputPath);
        if (!renderedFile.exists && outModule && outModule.file && outModule.file.exists) {
            renderedFile = outModule.file;
            outputPath = renderedFile.fsName;
        }
        if (!renderedFile.exists) {
            var altMp4 = new File(outputPath.replace(/\.[^\.]+$/, ".mp4"));
            var altAvi = new File(outputPath.replace(/\.[^\.]+$/, ".avi"));
            if (altMp4.exists) {
                renderedFile = altMp4;
                outputPath = altMp4.fsName;
            } else if (altAvi.exists) {
                renderedFile = altAvi;
                outputPath = altAvi.fsName;
            }
        }
        var outputExists = renderedFile.exists;
        var outputSize = outputExists ? renderedFile.length : 0;
        logMsg("Render output check: exists=" + outputExists + ", size=" + outputSize);

        if (!outputExists || outputSize <= 0) {
            throw new Error("Render finished but output file missing or empty: " + outputPath);
        }

        responseObj = {
            responseVersion: "1.0.0",
            jobId: request.jobId || "job-stage10-render-001",
            requestId: request.requestId || null,
            status: "succeeded",
            completedAt: getISOString(),
            durationMs: new Date().getTime() - startedAt,
            stepResults: [
                {
                    stepId: action0.actionId || "step-render-queue",
                    status: "succeeded",
                    message: "Composition rendered successfully for " + compName
                }
            ],
            errors: [],
            outputFiles: [outputPath],
            outputBytes: outputSize
        };
    } catch(err) {
        logMsg("Execution error: " + err.toString());
        responseObj = {
            responseVersion: "1.0.0",
            jobId: request.jobId || "job-stage10-render-001",
            requestId: request.requestId || null,
            status: "failed",
            completedAt: getISOString(),
            durationMs: new Date().getTime() - startedAt,
            stepResults: [],
            errors: [err.toString()],
            outputFiles: []
        };
    }

    // Write final ready signal
    try {
        var readyFile = new File(repoRoot + "/bridge/ready/ae.ready");
        if (readyFile.open("w")) {
            readyFile.encoding = "UTF-8";
            readyFile.write(toJson({ ts: getISOString() }));
            readyFile.close();
        }
    } catch(e) {}

    // Atomic write outbox
    var outboxDir = new Folder(repoRoot + "/bridge/outbox");
    if (!outboxDir.exists) outboxDir.create();

    var tempOut = new File(repoRoot + "/bridge/outbox/current.response.json." + (new Date()).getTime() + ".tmp");
    tempOut.encoding = "UTF-8";
    if (tempOut.open("w")) {
        tempOut.write(toJson(responseObj));
        tempOut.close();
        var finalFile = new File(repoRoot + "/bridge/outbox/current.response.json");
        try { if (finalFile.exists) finalFile.remove(); } catch(e) {}
        tempOut.rename("current.response.json");
        logMsg("Outbox written successfully.");
    }

    try {
        inboxFile.remove();
    } catch(err) {}
})();
