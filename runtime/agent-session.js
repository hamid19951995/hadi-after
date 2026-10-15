(function (root, factory) {
    "use strict";
    if (typeof module !== "undefined" && module.exports) module.exports = factory();
    else root.AEBossAgentSession = factory();
})(typeof window !== "undefined" ? window : this, function () {
    "use strict";

    var VERSION = "agent-session.v1";
    var MAX_TURNS = 6;
    var MAX_COMMANDS_PER_TURN = 4;
    var MAX_COMMANDS_TOTAL = 32;

    function clone(value) { return value === undefined ? undefined : JSON.parse(JSON.stringify(value)); }
    function assert(condition, message, code) { if (!condition) throw Object.assign(new Error(message), { code: code || "AGENT_SESSION_ERROR" }); }

    function create(request) {
        assert(typeof request === "string" && request.trim(), "original user request is required", "AGENT_REQUEST_REQUIRED");
        return { version: VERSION, id: "agent-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8), request: request.trim(), status: "ACTIVE", turns: 0, commandsIssued: 0, verifiedSteps: [], observations: [], finishAfterBatch: false, finalReply: "" };
    }

    function classifyResponse(response) {
        if (response && response.clarificationRequired === true) return "CLARIFICATION_REQUIRED";
        if (response && response.done === true && !(Array.isArray(response.commands) && response.commands.length)) return "DONE";
        return "CONTINUE";
    }

    function acceptTurn(session, response) {
        assert(session && session.status === "ACTIVE", "agent session is not active", "AGENT_SESSION_NOT_ACTIVE");
        assert(session.turns < MAX_TURNS, "agent turn limit reached", "AGENT_TURN_LIMIT");
        var commands = response && Array.isArray(response.commands) ? response.commands : [];
        assert(commands.length <= MAX_COMMANDS_PER_TURN, "agent command batch exceeds the per-turn limit", "AGENT_BATCH_LIMIT");
        assert(session.commandsIssued + commands.length <= MAX_COMMANDS_TOTAL, "agent command budget exhausted", "AGENT_COMMAND_LIMIT");
        var done = !!(response && response.done === true && commands.length === 0);
        assert(commands.length > 0 || done, "agent returned neither commands nor a completion decision", "AGENT_EMPTY_TURN");
        session.turns += 1;
        session.commandsIssued += commands.length;
        session.finishAfterBatch = done;
        session.finalReply = response && typeof response.reply === "string" ? response.reply : "";
        return { commands: commands, done: done, reply: session.finalReply, turn: session.turns };
    }

    function recordStep(session, command, result, hostGoverned, metadata) {
        assert(session && session.status === "ACTIVE", "agent session is not active", "AGENT_SESSION_NOT_ACTIVE");
        var hostState = result && result.aepipe && result.aepipe.state;
        var verified = !!(result && result.ok === true && (!hostGoverned || hostState === "SUCCESS"));
        var verification = null, evidence = result && result.aepipe && result.aepipe.evidence || [];
        for (var index = evidence.length - 1; index >= 0; index--) if (evidence[index] && (evidence[index].type === "verification" || evidence[index].type === "read-only-verification")) { verification = evidence[index]; break; }
        if (hostGoverned) verified = verified && !!(verification && verification.verified === true && (verification.type === "read-only-verification" || result.hostReadback && result.hostReadback.verified === true && verification.hostReadback && verification.hostReadback.verified === true));
        var observation = null;
        if (verification && verification.summary && verification.health && typeof verification.health.ok === "boolean" && Array.isArray(verification.health.issues) && Array.isArray(verification.health.warnings)) {
            try { observation = compactObservation(verification.summary, verification.health); } catch (ignoreObservationError) { observation = null; }
        }
        var repairsStep = metadata && metadata.repairsStep;
        if (repairsStep !== undefined) assert(typeof repairsStep === "number" && Math.floor(repairsStep) === repairsStep && repairsStep >= 0 && repairsStep < session.verifiedSteps.length && !session.verifiedSteps[repairsStep].verified, "repair must reference an earlier failed step", "AGENT_REPAIR_INVALID");
        session.finishAfterBatch = false;
        session.verifiedSteps.push({ command: command, verified: verified, hostGoverned: !!hostGoverned, hostState: hostState || null, hostReadback: result && result.hostReadback ? { verified: result.hostReadback.verified === true, strategy: result.hostReadback.strategy || null, expected: clone(result.hostReadback.expected || null) } : null, observation: observation, repairsStep: repairsStep === undefined ? null : repairsStep, message: result && result.message ? String(result.message).slice(0, 500) : "" });
        if (verified && repairsStep !== undefined) session.verifiedSteps[repairsStep].resolvedByStep = session.verifiedSteps.length - 1;
        return verified;
    }

    function compactObservation(summary, health) {
        assert(summary && summary.ok !== false && summary.project && Array.isArray(summary.compositions), "valid AE project summary is required", "AGENT_SUMMARY_INVALID");
        assert(health && typeof health.ok === "boolean" && Array.isArray(health.issues) && Array.isArray(health.warnings), "valid AE health readback is required", "AGENT_HEALTH_INVALID");
        return {
            project: summary.project,
            activeItem: summary.activeItem || null,
            activeType: summary.activeType || null,
            layerCount: Number(summary.layerCount) || 0,
            compositions: summary.compositions.map(function (composition) {
                return { name: composition.name, width: composition.width, height: composition.height, duration: composition.duration, frameRate: composition.frameRate, layers: composition.layers, layerItems: (composition.layerItems || []).slice(0, 100).map(function (layer) {
                    return { name: layer.name, type: layer.type, text: layer.text, keyframes: clone(layer.keyframes || {}), properties: clone(layer.properties || {}), effects: clone(layer.effects || []) };
                }) };
            }),
            selectedLayers: clone(summary.selectedLayers || []),
            projectItems: clone(summary.projectItems || []),
            renderQueueCount: Number(summary.renderQueueCount) || 0,
            renderQueueItems: clone(summary.renderQueueItems || []),
            health: { ok: health.ok, issueCount: health.issues.length, warningCount: health.warnings.length, issues: clone(health.issues), warnings: clone(health.warnings) }
        };
    }

    function recordObservation(session, summary, health) {
        assert(session && session.status === "ACTIVE", "agent session is not active", "AGENT_SESSION_NOT_ACTIVE");
        var observation = compactObservation(summary, health);
        observation.stepCount = session.verifiedSteps.length;
        session.observations.push(observation);
        return observation;
    }

    function requiresVisibleOutput(request) {
        var text = String(request || "").toLowerCase();
        if (/(?:\b(?:empty|blank)\s+(?:composition|comp|project|scene)\b|\b(?:composition|comp|project|scene)\s+(?:with\s+)?no\s+layers?\b|کامپوزیشن\s+خالی|پروژه\s+خالی|بدون\s+لایه)/i.test(text)) return false;
        return /(?:\b(?:project|scene|video|clip|animation|motion\s*graphic|teaser|intro|title|logo|character|story|poster|advert|promo|design)\b|پروژه|صحنه|ویدئو|ویدیو|کلیپ|انیمیشن|موشن|تیزر|عنوان|لوگو|شخصیت|داستان|پوستر|تبلیغ|طراحی)/i.test(text);
    }

    function hasVisibleLayers(summary) {
        if (!summary || !summary.activeItem || summary.activeType && summary.activeType !== "Composition") return false;
        var compositions = summary.compositions || [];
        for (var index = 0; index < compositions.length; index += 1) {
            var composition = compositions[index];
            if (composition.name !== summary.activeItem) continue;
            return Number(composition.layers) > 0 || !!(composition.layerItems && composition.layerItems.length);
        }
        return false;
    }

    function completionBlocker(session) {
        if (!session) return "No active agent session is available.";
        var observation = session.observations[session.observations.length - 1];
        if (!observation) return "A verified AE readback is required before completion.";
        if (observation.stepCount !== session.verifiedSteps.length) return "The latest operation has not been followed by a fresh AE readback.";
        if (session.commandsIssued > session.verifiedSteps.length) return "Issued commands remain unexecuted or have no recorded result.";
        if (session.verifiedSteps.some(function (step) { return !step.verified && step.resolvedByStep === undefined; })) return "A failed or unverified operation remains unresolved; execute and verify an explicit repair before completion.";
        var baseline = session.observations[0];
        var priorIssues = (baseline && baseline.health.issues || []).map(function (issue) { return JSON.stringify(issue); });
        var newIssues = observation.health.issues.some(function (issue) {
            var issueIndex = priorIssues.indexOf(JSON.stringify(issue));
            if (issueIndex < 0) return true;
            priorIssues.splice(issueIndex, 1);
            return false;
        });
        if (newIssues || observation.health.ok === false && observation.health.issues.length === 0) return "The final AE health readback has new or unexplained issues that must be resolved before completion.";
        if (!requiresVisibleOutput(session.request)) return "";
        if (!hasVisibleLayers(observation)) return "The requested project/scene has not been built: the active composition has no verified layers. Add at least one suitable visible layer (for example a designed background and requested text or shape) and verify it in the next AE readback before considering completion.";
        return "";
    }

    function rejectCompletion(session, reason) {
        assert(session && session.status === "ACTIVE", "agent session is not active", "AGENT_SESSION_NOT_ACTIVE");
        assert(session.turns < MAX_TURNS, "agent turn limit reached", "AGENT_TURN_LIMIT");
        assert(typeof reason === "string" && reason.trim(), "a completion blocker is required", "AGENT_COMPLETION_BLOCKER_REQUIRED");
        session.turns += 1;
        session.finishAfterBatch = false;
        return session.turns;
    }

    function continuationPrompt(session, blocker) {
        assert(session && session.observations.length, "a verified AE observation is required before continuing", "AGENT_OBSERVATION_REQUIRED");
        var lastObservation = session.observations[session.observations.length - 1];
        var recentSteps = session.verifiedSteps.slice(-MAX_COMMANDS_PER_TURN);
        var completionRequirement = blocker || completionBlocker(session);
        return "Continue the user's After Effects production request using the latest verified live project state.\n" +
            "Original request: " + session.request + "\n" +
            "Agent turn: " + session.turns + " of " + MAX_TURNS + "; commands used: " + session.commandsIssued + " of " + MAX_COMMANDS_TOTAL + ".\n" +
            "Previously executed steps and host verification: " + JSON.stringify(recentSteps) + "\n" +
            "Latest AE readback and health: " + JSON.stringify(lastObservation) + "\n" +
            (completionRequirement ? "Completion blocker that must be resolved before done:true: " + completionRequirement + "\n" : "") +
            "Decide from this actual state whether the requested deliverable is complete. Return JSON {done:true,reply:\"...\"} only when the deliverable is complete and verified. If user input is required, return {clarificationRequired:true,reply:\"...\"}; never mark a clarification as done. Otherwise return {done:false,commands:[...]} containing only the next safe, necessary commands. Reuse existing project objects where appropriate. Do not repeat verified operations, claim unobserved results, or exceed the command allowlist and parameter validation.";
    }

    function complete(session, reply) {
        assert(session && session.status === "ACTIVE", "agent session is not active", "AGENT_SESSION_NOT_ACTIVE");
        assert(session.observations.length > 0, "cannot finish before an AE readback", "AGENT_OBSERVATION_REQUIRED");
        assert(session.finishAfterBatch === true, "the agent must confirm completion after reviewing the latest AE readback", "AGENT_COMPLETION_NOT_CONFIRMED");
        assert(session.verifiedSteps.some(function (step) { return step.verified && step.hostGoverned; }), "cannot report completion without a verified After Effects host step", "AGENT_VERIFIED_STEP_REQUIRED");
        var blocker = completionBlocker(session);
        assert(!blocker, blocker || "requested deliverable is incomplete", "AGENT_DELIVERABLE_INCOMPLETE");
        session.status = "COMPLETED";
        if (reply) session.finalReply = String(reply);
        return session;
    }

    function stop(session, reason) {
        if (session && session.status === "ACTIVE") { session.status = "BLOCKED"; session.stopReason = String(reason || "Agent stopped before verified completion."); }
        return session;
    }

    return { VERSION: VERSION, MAX_TURNS: MAX_TURNS, MAX_COMMANDS_PER_TURN: MAX_COMMANDS_PER_TURN, MAX_COMMANDS_TOTAL: MAX_COMMANDS_TOTAL, create: create, classifyResponse: classifyResponse, acceptTurn: acceptTurn, recordStep: recordStep, compactObservation: compactObservation, recordObservation: recordObservation, requiresVisibleOutput: requiresVisibleOutput, hasVisibleLayers: hasVisibleLayers, completionBlocker: completionBlocker, rejectCompletion: rejectCompletion, continuationPrompt: continuationPrompt, complete: complete, stop: stop };
});
