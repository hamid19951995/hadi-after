(function (global) {
    "use strict";
    var KEY = "aeBossOmegaAepipeJournal";
    var STATES = { PROPOSED: "PROPOSED", PREFLIGHT: "PREFLIGHT", DRY_RUN: "DRY_RUN", APPROVAL_REQUIRED: "APPROVAL_REQUIRED", LEASED: "LEASED", APPLYING: "APPLYING", VERIFYING: "VERIFYING", SUCCESS: "SUCCESS", FAILED: "FAILED", UNKNOWN: "UNKNOWN", CANCELLED: "CANCELLED" };
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
    function transition(env, state, detail) { env.state = state; env.updatedAt = now(); if (detail) env.evidence.push({ at: now(), type: "state", state: state, detail: detail }); return env; }
    function dryRun(command, payload, source) {
        var env = envelope(command, payload, source);
        transition(env, STATES.PREFLIGHT, "Schema and scope validated.");
        if (isMutation(command)) transition(env, STATES.DRY_RUN, "Mutation staged; no host change performed.");
        else transition(env, STATES.LEASED, "Read-only command may proceed.");
        append(env);
        return env;
    }
    function approve(env) { if (!env || env.state !== STATES.DRY_RUN) return false; env.policy.mode = "APPLY"; env.lease = { id: "lease-" + env.id, issuedAt: now(), expiresAt: new Date(Date.now() + 120000).toISOString(), authority: "user" }; transition(env, STATES.LEASED, "User approval recorded with bounded execution lease."); append(env); return true; }
    function recordResult(env, result) { if (!result || result.ok === false) transition(env, STATES.FAILED, result && result.message || "Host execution failed."); else transition(env, STATES.VERIFYING, "Host returned; readback verification requested."); env.evidence.push({ at: now(), type: "host-result", result: result || null }); append(env); return env; }
    function verify(env, summary, health, result) { var verified = !!(result && result.ok !== false && summary && health && health.ok !== false); if (verified) transition(env, STATES.SUCCESS, "Post-condition readback and health verification passed."); else transition(env, STATES.UNKNOWN, "Verification incomplete; state remains UNKNOWN."); env.evidence.push({ at: now(), type: "verification", verified: verified, summary: summary || null, health: health || null }); append(env); return env; }
    function audit() { return read(); }
    global.AEPipe = { STATES: STATES, isMutation: isMutation, create: envelope, dryRun: dryRun, approve: approve, recordResult: recordResult, verify: verify, audit: audit, append: append };
})(window);
