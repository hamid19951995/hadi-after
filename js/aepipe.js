(function (global) {
    "use strict";
    var KEY = "aeBossOmegaAepipeJournal";
    var STATES = { PROPOSED: "PROPOSED", PREFLIGHT: "PREFLIGHT", DRY_RUN: "DRY_RUN", APPROVAL_REQUIRED: "APPROVAL_REQUIRED", LEASED: "LEASED", APPLYING: "APPLYING", VERIFYING: "VERIFYING", SUCCESS: "SUCCESS", FAILED: "FAILED", UNKNOWN: "UNKNOWN", CANCELLED: "CANCELLED" };
    var ALLOWED = { PROPOSED: ["PREFLIGHT", "CANCELLED"], PREFLIGHT: ["DRY_RUN", "LEASED", "FAILED", "CANCELLED"], DRY_RUN: ["LEASED", "CANCELLED"], LEASED: ["APPLYING", "CANCELLED", "FAILED", "UNKNOWN"], APPLYING: ["VERIFYING", "UNKNOWN"], VERIFYING: ["SUCCESS", "UNKNOWN", "FAILED"], SUCCESS: [], FAILED: [], UNKNOWN: [], CANCELLED: [] };
    var MUTATIONS = ["createProject", "addTextLayer", "addSolidLayer", "addRectangleShape", "addEllipseShape", "addCamera", "addLight", "addDropShadow", "duplicateSelectedLayer", "addGaussianBlur", "buildAntiTheftTeaser", "setOpacityExpression", "removeSelectedLayers", "renderQueue", "queueComposition", "saveProject", "snapshotProject", "restoreSnapshot", "importFootage", "buildAudioTeaser", "updateSelectedLayer", "editLayer", "animateSelectedOpacity", "animateSelectedPosition", "transformSelectedLayer", "updateComposition", "openComposition", "openProject", "runScript"];
    function now() { return new Date().toISOString(); }
    function id() { return "aepipe-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8); }
    function read() { try { return JSON.parse(global.localStorage.getItem(KEY) || "[]"); } catch (e) { return []; } }
    function write(items) { try { global.localStorage.setItem(KEY, JSON.stringify(items.slice(-200))); } catch (e) {} }
    function append(entry) { var items = read(); items.push(entry); write(items); return entry; }
    function isMutation(command) { return MUTATIONS.indexOf(command) >= 0; }
    function envelope(command, payload, source) {
        return { id: id(), action: command, intent: { source: source || "user", command: command, payload: payload || {} }, scope: { host: "after-effects", project: "active", userOwnedState: true }, authority: { modelMayPropose: true, runtimeMustAuthorize: true, userApprovalRequired: isMutation(command) }, policy: { mode: "DRY_RUN", failClosed: true, reversible: true }, lease: null, state: STATES.PROPOSED, evidence: [], createdAt: now(), updatedAt: now() };
    }
    function transition(env, state, detail) {
        if (!env || !ALLOWED[env.state] || ALLOWED[env.state].indexOf(state) < 0) throw Object.assign(new Error("Illegal AEPIPE transition: " + (env && env.state) + " -> " + state), { code: "AEPIPE_ILLEGAL_TRANSITION" });
        env.state = state; env.updatedAt = now(); if (detail) env.evidence.push({ at: now(), type: "state", state: state, detail: detail }); return env;
    }
    function dryRun(command, payload, source) {
        var env = envelope(command, payload, source);
        transition(env, STATES.PREFLIGHT, "Schema and scope validated.");
        if (isMutation(command)) transition(env, STATES.DRY_RUN, "Mutation staged; no host change performed.");
        else transition(env, STATES.LEASED, "Read-only command may proceed.");
        append(env);
        return env;
    }
    function approve(env) { if (!env || env.state !== STATES.DRY_RUN) return false; env.policy.mode = "APPLY"; env.lease = { id: "lease-" + env.id, issuedAt: now(), expiresAt: new Date(Date.now() + 120000).toISOString(), authority: "user" }; transition(env, STATES.LEASED, "User approval recorded with bounded execution lease."); append(env); return true; }
    function beginApply(env) {
        if (!env || env.state !== STATES.LEASED) throw Object.assign(new Error("Host execution requires LEASED state."), { code: "AEPIPE_EXECUTION_NOT_AUTHORIZED" });
        if (isMutation(env.action) && (!env.lease || Date.parse(env.lease.expiresAt) <= Date.now())) throw Object.assign(new Error("Mutation lease is missing or expired."), { code: "AEPIPE_LEASE_INVALID" });
        transition(env, STATES.APPLYING, "Execution entered host bridge."); append(env); return env;
    }
    function failBeforeApply(env, reason) {
        if (!env || env.state !== STATES.LEASED) throw Object.assign(new Error("A pre-apply failure requires a leased operation."), { code: "AEPIPE_INVALID_PREFLIGHT_STATE" });
        transition(env, STATES.FAILED, reason || "Host preflight failed; mutation was not started.");
        env.evidence.push({ at: now(), type: "pre-apply-failure", reason: reason || "Host preflight failed; mutation was not started." });
        append(env);
        return env;
    }
    function recordResult(env, result) { if (!env || env.state !== STATES.APPLYING) throw Object.assign(new Error("Host result requires APPLYING state."), { code: "AEPIPE_INVALID_RESULT_STATE" }); transition(env, STATES.VERIFYING, "Host returned; readback verification requested."); env.evidence.push({ at: now(), type: "host-result", result: result || null }); append(env); return env; }
    function completeReadOnly(env, result) {
        if (!env || env.state !== STATES.VERIFYING || isMutation(env.action)) throw Object.assign(new Error("Read-only completion requires a non-mutating operation in VERIFYING state."), { code: "AEPIPE_INVALID_READONLY_COMPLETION" });
        var verified = !!(result && result.ok === true);
        transition(env, verified ? STATES.SUCCESS : STATES.UNKNOWN, verified ? "Read-only host readback completed." : "Read-only host response was not verified.");
        env.evidence.push({ at: now(), type: "read-only-verification", verified: verified, result: result || null }); append(env); return env;
    }
    function healthIssueKey(issue) { return typeof issue === "string" ? issue : JSON.stringify(issue); }
    function healthHasNoNewIssues(after, before) {
        if (!after || Object.prototype.toString.call(after.issues) !== "[object Array]" || !before || Object.prototype.toString.call(before.issues) !== "[object Array]") return false;
        var prior = {};
        for (var index = 0; index < before.issues.length; index++) {
            var priorKey = healthIssueKey(before.issues[index]);
            prior[priorKey] = (prior[priorKey] || 0) + 1;
        }
        for (var issueIndex = 0; issueIndex < after.issues.length; issueIndex++) {
            var currentKey = healthIssueKey(after.issues[issueIndex]);
            if (!prior[currentKey]) return false;
            prior[currentKey] -= 1;
        }
        return true;
    }
    function verify(env, summary, health, result) {
        var hostReadback = result && result.hostReadback;
        var summaryValid = !!(summary && summary.project && Object.prototype.toString.call(summary.compositions) === "[object Array]");
        var healthValid = !!(health && typeof health.ok === "boolean" && Object.prototype.toString.call(health.issues) === "[object Array]" && Object.prototype.toString.call(health.warnings) === "[object Array]");
        var healthVerified = !!(healthValid && (health.ok === true || healthHasNoNewIssues(health, env && env.baselineHealth)));
        var verified = !!(result && result.ok === true && healthVerified && summaryValid && hostReadback && hostReadback.verified === true && hostReadback.after && hostReadback.after.project === summary.project);
        if (!env || env.state !== STATES.VERIFYING) throw Object.assign(new Error("Verification requires VERIFYING state."), { code: "AEPIPE_INVALID_VERIFICATION_STATE" });
        if (verified) transition(env, STATES.SUCCESS, health.ok ? "Host semantic readback and a clean health report passed." : "Host semantic readback passed without introducing new health issues.");
        else transition(env, STATES.UNKNOWN, "Verification incomplete; state remains UNKNOWN.");
        env.evidence.push({ at: now(), type: "verification", verified: verified, healthVerified: healthVerified, baselineIssueCount: env.baselineHealth && env.baselineHealth.issues ? env.baselineHealth.issues.length : null, summary: summary || null, health: health || null, hostReadback: hostReadback || null });
        append(env);
        return env;
    }
    function markUnknown(env, reason) {
        if (!env) return null;
        if (env.state !== STATES.SUCCESS && env.state !== STATES.FAILED && env.state !== STATES.CANCELLED && env.state !== STATES.UNKNOWN) transition(env, STATES.UNKNOWN, reason || "Host outcome is unknown; readback is required before retry.");
        env.evidence.push({ at: now(), type: "unknown-outcome", reason: reason || "Host outcome is unknown; readback is required before retry." });
        append(env);
        return env;
    }
    function audit() { return read(); }
    global.AEPipe = { STATES: STATES, isMutation: isMutation, create: envelope, dryRun: dryRun, approve: approve, beginApply: beginApply, failBeforeApply: failBeforeApply, recordResult: recordResult, completeReadOnly: completeReadOnly, verify: verify, markUnknown: markUnknown, audit: audit, append: append };
})(window);
