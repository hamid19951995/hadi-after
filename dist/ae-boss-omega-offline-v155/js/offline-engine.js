(function () {
    "use strict";
    var api = {};
    var childProcess = null, path = null, fs = null;
    try { childProcess = require("child_process"); path = require("path"); fs = require("fs"); } catch (_) {}
    var extensionRoot = null;
    try { if (window.cep && window.cep.fs && window.cep.fs.getSystemPath) extensionRoot = window.cep.fs.getSystemPath(window.cep.fs.SystemPath.EXTENSION); } catch (_) {}
    if (!extensionRoot) extensionRoot = ".";
    function runtimeCandidates() {
        var root = extensionRoot;
        return [
            typeof process !== "undefined" && process.env && process.env.AE_BOSS_PYTHON ? process.env.AE_BOSS_PYTHON : null,
            path && path.join(root, ".venv", "Scripts", "python.exe"),
            path && path.join(root, "python.exe"),
            "python"
        ].filter(Boolean);
    }
    function invoke(request, callback) {
        if (!childProcess || !path) { callback({ ok: false, error: "OFFLINE_NODE_RUNTIME_UNAVAILABLE" }); return; }
        var candidates = runtimeCandidates();
        var index = 0;
        function attempt() {
            if (index >= candidates.length) { callback({ ok: false, error: "PYTHON_RUNTIME_NOT_FOUND" }); return; }
            var exe = candidates[index++];
            var args = [path.join(extensionRoot, "offline-runtime", "offline_engine.py")];
            var child;
            try { child = childProcess.spawn(exe, args, { cwd: extensionRoot, windowsHide: true, env: Object.assign({}, process.env || {}, { PYTHONNOUSERSITE: "1", PYTHONUNBUFFERED: "1", AE_BOSS_OFFLINE: "1" }) }); }
            catch (_) { attempt(); return; }
            var stdout = "", stderr = "", done = false;
            function finish(result) { if (done) return; done = true; try { child.kill(); } catch (_) {} callback(result); }
            child.stdout.on("data", function (chunk) { stdout += String(chunk); });
            child.stderr.on("data", function (chunk) { stderr += String(chunk); });
            child.on("error", function () { if (done) return; done = true; try { child.kill(); } catch (_) {} attempt(); });
            child.on("close", function (code) {
                if (done) return;
                var line = stdout.trim().split(/\r?\n/).filter(Boolean).pop();
                if (!line) { if (code !== 0) return attempt(); return finish({ ok: false, error: "OFFLINE_ENGINE_EMPTY_OUTPUT", stderr: stderr }); }
                try { var parsed = JSON.parse(line); parsed.pythonExitCode = code; finish(parsed); }
                catch (_) { finish({ ok: false, error: "OFFLINE_ENGINE_INVALID_JSON", raw: line, stderr: stderr }); }
            });
            try {
                child.stdin.write(JSON.stringify(request) + "\n");
                child.stdin.end();
            } catch (_) { attempt(); }
        }
        attempt();
    }
    api.health = function (callback) { invoke({ op: "health" }, callback); };
    api.infer = function (text, language, callback) { invoke({ op: "infer", text: text, language: language || "auto" }, callback); };
    api.compileActionPlan = function (actions, fps, sceneDuration, callback) { invoke({ op: "compile_action_plan", actions: actions || [], fps: fps || 30, sceneDuration: sceneDuration || 5 }, callback); };
    api.validateActionPlan = function (plan, callback) { invoke({ op: "validate_action_plan", plan: plan }, callback); };
    api.validatePropPlan = function (plan, callback) { invoke({ op: "validate_prop_plan", plan: plan }, callback); };
    api.audit = function (root, callback) { invoke({ op: "audit", root: root }, callback); };
    api.fingerprint = function (value, callback) { invoke({ op: "fingerprint", value: value }, callback); };
    api.invokeV32 = function (request, callback) {
        if (!childProcess || !path) { callback({ ok: false, error: "OFFLINE_NODE_RUNTIME_UNAVAILABLE" }); return; }
        var candidates = runtimeCandidates();
        var index = 0;
        function attempt() {
            if (index >= candidates.length) { callback({ ok: false, error: "PYTHON_RUNTIME_NOT_FOUND" }); return; }
            var exe = candidates[index++], args = [path.join(extensionRoot, "offline-runtime", "offline_engine_v32.py")];
            var child; try { child = childProcess.spawn(exe, args, { cwd: extensionRoot, windowsHide: true, env: Object.assign({}, process.env || {}, { PYTHONNOUSERSITE: "1", PYTHONUNBUFFERED: "1", AE_BOSS_OFFLINE: "1" }) }); } catch (_) { attempt(); return; }
            var out="", err="", finished=false; function done(result){ if(finished)return; finished=true; try{child.kill();}catch(_e){} callback(result); }
            child.stdout.on("data",function(c){out+=String(c);}); child.stderr.on("data",function(c){err+=String(c);}); child.on("error",function(){if(!finished){try{child.kill();}catch(_e){} attempt();}});
            child.on("close",function(code){ if(finished)return; var line=out.trim().split(/\r?\n/).filter(Boolean).pop(); if(!line){ if(code!==0)return attempt(); return done({ok:false,error:"OFFLINE_V32_EMPTY_OUTPUT",stderr:err}); } try{var parsed=JSON.parse(line); parsed.pythonExitCode=code; done(parsed);}catch(_e){done({ok:false,error:"OFFLINE_V32_INVALID_JSON",raw:line,stderr:err});}});
            try { child.stdin.write(JSON.stringify(request)+"\n"); child.stdin.end(); } catch(_) { attempt(); }
        }
        attempt();
    };
    window.AEBossOffline = api;
})();
