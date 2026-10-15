(function (root, factory) {
    "use strict";
    if (typeof module !== "undefined" && module.exports) module.exports = factory();
    else root.AEBossWorkflowRun = factory();
})(typeof window !== "undefined" ? window : this, function () {
    "use strict";
    function copy(value) { return JSON.parse(JSON.stringify(value)); }
    function create(request) {
        return { version: 1, id: "run-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2), request: request, status: "running", startedAt: new Date().toISOString(), events: [], receipt: null };
    }
    function record(run, type, detail) {
        if (!run || run.status !== "running") return null;
        var event = { sequence: run.events.length + 1, at: new Date().toISOString(), type: type, detail: copy(detail || {}) };
        run.events.push(event);
        return event;
    }
    function receipt(summary, health, savedPath) {
        return copy({ project: summary.project, activeItem: summary.activeItem || null, compositions: summary.compositions || [], health: health, savedProject: savedPath || null, renderQueue: summary.renderQueueItems || [], verifiedAt: new Date().toISOString() });
    }
    function finish(run, status, message, evidence) {
        if (!run || run.status !== "running") return run;
        if (status === "verified" && (!evidence || !evidence.project || !Array.isArray(evidence.compositions) || !evidence.health || !Array.isArray(evidence.health.issues))) throw new Error("Final live readback is required for verified completion.");
        record(run, "terminal", { status: status, message: message });
        run.status = status;
        run.message = String(message || "");
        run.receipt = evidence ? copy(evidence) : null;
        run.finishedAt = new Date().toISOString();
        return run;
    }
    function recover(run) {
        if (!run || run.version !== 1 || !Array.isArray(run.events)) return null;
        var recovered = copy(run);
        if (recovered.status === "running") finish(recovered, "interrupted", "Panel closed before completion. Inspect the live project before retrying; no automatic replay was performed.");
        return recovered;
    }
    function savedStateMatches(before, after, saveResult) {
        if (!before || !after || after.ok !== true || !saveResult || !saveResult.hostReadback || saveResult.hostReadback.verified !== true) return false;
        var witness = saveResult.hostReadback.after;
        if (!witness || !after.project || after.project === "Untitled project" || witness.project !== after.project) return false;
        function state(summary) {
            return { activeItem: summary.activeItem || null, activeType: summary.activeType || null, compositions: summary.compositions || [], projectItems: summary.projectItems || [], renderQueueItems: summary.renderQueueItems || [] };
        }
        return JSON.stringify(state(before)) === JSON.stringify(state(after));
    }
    return { create: create, record: record, receipt: receipt, finish: finish, recover: recover, savedStateMatches: savedStateMatches };
});
