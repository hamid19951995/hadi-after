(function (root, factory) {
    "use strict";
    if (typeof module !== "undefined" && module.exports) module.exports = factory();
    else root.AEBossOfflineCore = factory();
})(typeof window !== "undefined" ? window : this, function () {
    "use strict";

    var VERSION = "offline-core.v1";
    var INTENTS = {
        createComposition: { capability: "ae.project.write", aliases: ["create composition", "new composition", "make a composition", "کامپوزیشن بساز", "یک کامپوزیشن بساز", "کامپوزیشن جدید"] },
        addText: { capability: "ae.project.write", aliases: ["add text", "text layer", "add a text layer", "متن اضافه کن", "یک متن اضافه کن", "لایه متن"] },
        animateLayer: { capability: "ae.project.write", aliases: ["animate", "animate layer", "animate it", "متحرک کن", "آن را متحرک کن", "انیمیشن"] },
        renderComposition: { capability: "ae.render.queue", aliases: ["render", "render composition", "export composition", "رندر بگیر", "رندر کن", "از کامپوزیشن رندر بگیر"] },
        inspectProject: { capability: "ae.project.read", aliases: ["read project", "inspect project", "project state", "وضعیت پروژه", "پروژه را بخوان"] }
    };
    var STATES = ["IDLE", "PLANNING", "PREFLIGHT", "WAITING_PERMISSION", "READY", "RUNNING", "VERIFYING", "CHECKPOINTED", "PAUSED", "CANCELLED", "FAILED", "COMPLETED"];
    var TRANSITIONS = {
        IDLE: ["PLANNING"], PLANNING: ["PREFLIGHT", "FAILED", "CANCELLED"], PREFLIGHT: ["WAITING_PERMISSION", "READY", "FAILED", "CANCELLED"],
        WAITING_PERMISSION: ["READY", "CANCELLED", "FAILED"], READY: ["RUNNING", "CANCELLED"], RUNNING: ["VERIFYING", "CHECKPOINTED", "PAUSED", "CANCELLED", "FAILED"],
        VERIFYING: ["RUNNING", "COMPLETED", "CHECKPOINTED", "FAILED"], CHECKPOINTED: ["RUNNING", "PAUSED", "CANCELLED", "FAILED"], PAUSED: ["RUNNING", "CANCELLED", "FAILED"],
        CANCELLED: ["PLANNING", "IDLE"], FAILED: ["PLANNING", "IDLE"], COMPLETED: ["IDLE", "PLANNING"]
    };
    var CAPABILITIES = { "ae.project.read": "Ask", "ae.project.write": "Ask", "ae.render.queue": "Ask", "filesystem.read": "Ask", "filesystem.write": "Ask", "runtime.execute": "Deny" };

    function stable(value) {
        if (value === null || typeof value !== "object") return JSON.stringify(value);
        if (Array.isArray(value)) return "[" + value.map(stable).join(",") + "]";
        return "{" + Object.keys(value).sort().map(function (key) { return JSON.stringify(key) + ":" + stable(value[key]); }).join(",") + "}";
    }
    function hash(value) {
        var text = stable(value), hashValue = 2166136261, index;
        for (index = 0; index < text.length; index += 1) { hashValue ^= text.charCodeAt(index); hashValue = Math.imul(hashValue, 16777619); }
        return (hashValue >>> 0).toString(16).padStart(8, "0") + "-" + text.length.toString(16);
    }
    function now() { return new Date().toISOString(); }
    function normalize(text) { return String(text || "").toLowerCase().replace(/[،؛؟]/g, " ").replace(/\s+/g, " ").trim(); }
    function numberAfter(text, patterns, fallback) {
        var match, index;
        for (index = 0; index < patterns.length; index += 1) { match = text.match(patterns[index]); if (match) return Number(match[1]); }
        return fallback;
    }
    function resolveIntent(request, context) {
        var text = typeof request === "string" ? request : request && request.text || "", normalized = normalize(text), best = null, intentName, definition, alias, position, score;
        Object.keys(INTENTS).forEach(function (name) {
            definition = INTENTS[name];
            definition.aliases.forEach(function (candidate) {
                alias = normalize(candidate); position = normalized.indexOf(alias);
                if (position >= 0) { score = alias.length / Math.max(normalized.length, 1); if (!best || score > best.score) best = { intent: name, score: Math.min(0.99, 0.72 + score * 0.45), matchedAlias: candidate }; }
            });
        });
        if (/(?:create|make|build|new)\b.*\bcomposition\b|\bcomposition\b.*(?:create|make|build|new)\b|کامپوزیشن.*(?:بساز|ایجاد|جدید)|(?:بساز|ایجاد کن).*کامپوزیشن/.test(normalized)) best = { intent: "createComposition", score: 0.94, matchedAlias: "composition creation pattern" };
        if (/(?:add|create|make)\b.*\btext\b|\btext\b.*(?:add|create)|(?:متن|لایه متن).*(?:اضافه|بساز|ایجاد)/.test(normalized)) best = { intent: "addText", score: 0.92, matchedAlias: "text creation pattern" };
        if (/(?:animate|move)\b.*(?:layer|it|text)|(?:متحرک|انیمیشن|حرکت).*/.test(normalized)) best = { intent: "animateLayer", score: 0.9, matchedAlias: "animation pattern" };
        if (/(?:render|export)\b.*(?:composition|comp)?|(?:رندر|خروجی).*/.test(normalized)) best = { intent: "renderComposition", score: 0.9, matchedAlias: "render pattern" };
        if (!best) return { ok: true, intent: "unsupported", confidence: 0, state: "CLARIFICATION_REQUIRED", request: text, reason: "No offline intent matched." };
        var parameters = { request: text };
        if (best.intent === "createComposition") {
            parameters.name = (text.match(/(?:named|called|نام(?:ش)?|به نام)\s+["']?([\w\u0600-\u06ff -]{2,48})/i) || [])[1] || (context && context.lastComposition) || "OMEGA_Offline_01";
            parameters.width = numberAfter(text, [/([0-9]{3,5})\s*[x×]\s*[0-9]{3,5}/i], 1920);
            parameters.height = numberAfter(text, [/[0-9]{3,5}\s*[x×]\s*([0-9]{3,5})/i], 1080);
            parameters.duration = numberAfter(text, [/([0-9]+(?:\.[0-9]+)?)\s*(?:seconds|sec|ثانیه)/i], 10);
            parameters.frameRate = numberAfter(text, [/([0-9]+)\s*(?:fps|فریم)/i], 30);
        }
        if (best.intent === "addText") parameters.text = (text.match(/(?:text|متن|say|بنویس)\s*[:：]?\s*["']?([^"'،؛\n]{2,80})/i) || [])[1] || "AE BOSS OMEGA";
        if (best.intent === "animateLayer") { parameters.target = context && context.lastCreatedLayer || "selected"; parameters.from = [200, 540]; parameters.to = [1600, 540]; parameters.duration = 5; }
        return { ok: true, intent: best.intent, confidence: Number(best.score.toFixed(3)), state: best.score >= 0.78 ? "RESOLVED" : "CLARIFICATION_REQUIRED", matchedAlias: best.matchedAlias, parameters: parameters, capability: INTENTS[best.intent].capability, context: context || {} };
    }

    function ContextRuntime(initial) { this.state = Object.assign({ activeProject: null, activeComposition: null, selectedLayers: [], lastCreatedItem: null, lastCreatedLayer: null, lastAction: null, lastResult: null, currentJob: null, sessionTimeline: [] }, initial || {}); }
    ContextRuntime.prototype.update = function (patch) { this.state = Object.assign({}, this.state, patch || {}); this.state.sessionTimeline = this.state.sessionTimeline.concat([{ at: now(), action: patch && patch.lastAction || "context.update" }]).slice(-100); return this.snapshot(); };
    ContextRuntime.prototype.snapshot = function () { return JSON.parse(JSON.stringify(this.state)); };

    function compilePlan(resolution, context) {
        if (!resolution || resolution.state !== "RESOLVED") return { ok: false, state: "CLARIFICATION_REQUIRED", reason: "Intent confidence is insufficient." };
        var steps = [], intent = resolution.intent, parameters = resolution.parameters || {};
        if (intent === "createComposition") steps.push({ id: "create_comp", action: "createProject", capability: "ae.project.write", dependsOn: [], input: parameters, verify: "composition.exists" });
        if (intent === "addText") steps.push({ id: "create_text", action: "addTextLayer", capability: "ae.project.write", dependsOn: [], input: parameters, verify: "layer.exists" });
        if (intent === "animateLayer") steps.push({ id: "animate_layer", action: "animateSelectedPosition", capability: "ae.project.write", dependsOn: [], input: parameters, verify: "keyframes.exists" });
        if (intent === "renderComposition") steps.push({ id: "queue_render", action: "queueComposition", capability: "ae.render.queue", dependsOn: [], input: parameters, verify: "renderQueue.containsActiveComposition" });
        if (intent === "inspectProject") steps.push({ id: "read_project", action: "summary", capability: "ae.project.read", dependsOn: [], input: parameters, verify: "summary.read" });
        steps.push({ id: "verify", action: "summary", capability: "ae.project.read", dependsOn: steps.map(function (step) { return step.id; }), input: {}, verify: "expectedState.matches" });
        var plan = { version: VERSION, intent: intent, request: resolution.parameters.request, parameters: parameters, context: context || {}, steps: steps, fingerprint: null };
        plan.fingerprint = hash({ version: plan.version, intent: plan.intent, request: plan.request, parameters: plan.parameters, context: plan.context, steps: plan.steps });
        return { ok: true, plan: plan, fingerprint: plan.fingerprint };
    }
    function validateGraph(plan) {
        var steps = plan && plan.steps || [], ids = {}, visiting = {}, visited = {}, errors = [];
        steps.forEach(function (step) { if (ids[step.id]) errors.push({ code: "DUPLICATE_ACTION", step: step.id }); ids[step.id] = step; });
        steps.forEach(function (step) { (step.dependsOn || []).forEach(function (dependency) { if (!ids[dependency]) errors.push({ code: "MISSING_DEPENDENCY", step: step.id, dependency: dependency }); }); });
        function visit(id) { if (visiting[id]) { errors.push({ code: "CIRCULAR_DEPENDENCY", step: id }); return; } if (visited[id]) return; visiting[id] = true; (ids[id] && ids[id].dependsOn || []).forEach(visit); delete visiting[id]; visited[id] = true; }
        steps.forEach(function (step) { visit(step.id); });
        return { ok: errors.length === 0, errors: errors };
    }
    function checkpoint(jobId, plan, currentStep, completedSteps, context, verification) { return { jobId: jobId, planFingerprint: plan && plan.fingerprint, currentStep: currentStep, completedSteps: completedSteps || [], contextSnapshot: context || {}, verificationResults: verification || [], timestamp: now(), fingerprint: hash({ jobId: jobId, planFingerprint: plan && plan.fingerprint, currentStep: currentStep, completedSteps: completedSteps || [], context: context || {}, verification: verification || [] }) }; }
    function canResume(plan, saved) { return !!(plan && saved && plan.fingerprint && saved.planFingerprint === plan.fingerprint); }
    function transition(job, next) { if (!job || STATES.indexOf(next) < 0 || (TRANSITIONS[job.state] || []).indexOf(next) < 0) return { ok: false, error: "INVALID_STATE_TRANSITION", from: job && job.state, to: next }; var previous = job.state; job.state = next; job.history = (job.history || []).concat([{ from: previous, to: next, at: now() }]); return { ok: true, job: job }; }
    function evidence(before, action, after, verification, fingerprint) { return { before: before || null, action: action || null, after: after || null, verification: verification || null, timestamp: now(), fingerprint: fingerprint || hash({ before: before, action: action, after: after, verification: verification }) }; }
    function auditNetworkText(text, source) { var findings = [], match, pattern = /(?:fetch|XMLHttpRequest|WebSocket|https?:\/\/|sendBeacon|openURLInDefaultBrowser)/gi; while ((match = pattern.exec(String(text || "")))) findings.push({ type: "network-reference", token: match[0], source: source || "unknown", operation: "static-audit", policy: "OFFLINE_STRICT_BLOCK" }); return { ok: findings.length === 0, findings: findings, policy: "OFFLINE_STRICT" }; }
    return { VERSION: VERSION, INTENTS: INTENTS, STATES: STATES, CAPABILITIES: CAPABILITIES, stable: stable, hash: hash, resolveIntent: resolveIntent, ContextRuntime: ContextRuntime, compilePlan: compilePlan, validateGraph: validateGraph, checkpoint: checkpoint, canResume: canResume, transition: transition, evidence: evidence, auditNetworkText: auditNetworkText };
});
