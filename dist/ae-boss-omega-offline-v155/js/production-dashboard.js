(function () {
    "use strict";

    var events = document.getElementById("liveEvents");
    var output = document.getElementById("liveReadbackOutput");
    var planList = document.getElementById("livePlanList");

    var activeRunId = null;
    var lastReceipt = null;

    function acceptEvent(detail, allowStart) {
        if (allowStart && detail.phase === "request" && detail.status === "received") activeRunId = detail.runId || null;
        return !activeRunId || detail.runId === activeRunId;
    }

    function showReceipt(detail) {
        if (detail.receipt) lastReceipt = detail.receipt;
        if (output) output.textContent = JSON.stringify({
            runId: detail.runId || activeRunId,
            status: detail.status,
            message: detail.message || "",
            receipt: detail.receipt || null
        }, null, 2);
    }

    function restoreRun() {
        if (!window.AEBossAgentUI || typeof window.AEBossAgentUI.getRun !== "function") return;
        var run = window.AEBossAgentUI.getRun();
        if (!run) return;
        activeRunId = run.id;
        (run.events || []).slice(-40).forEach(function (event) {
            var detail = event.detail || {};
            log("Recovered " + event.type + (detail.phase ? " / " + detail.phase : "") + (detail.status ? " — " + detail.status : "") + (detail.message ? ": " + detail.message : ""), { sequence: event.sequence, at: event.at });
        });
        log(run.status === "interrupted" ? "Previous workflow was interrupted. No operations were replayed; inspect the live project before starting a new request." : "Recovered workflow status: " + run.status);
        showReceipt({ runId: run.id, status: run.status, message: run.message, receipt: run.receipt });
    }

    function log(message, detail) {
        if (!events) return;
        var item = document.createElement("p");
        item.textContent = (detail && detail.at ? String(detail.at) : new Date().toLocaleTimeString()) + (detail && detail.sequence != null ? " #" + detail.sequence : "") + " " + message;
        events.insertBefore(item, events.firstChild);
        while (events.children.length > 40) events.removeChild(events.lastChild);
    }

    function setHostState(host, bridge) {
        var hostStatus = document.getElementById("liveHostStatus");
        var bridgeStatus = document.getElementById("liveBridgeStatus");
        var readyStatus = document.getElementById("liveReadyStatus");
        if (hostStatus) hostStatus.textContent = host;
        if (bridgeStatus) bridgeStatus.textContent = bridge;
        if (readyStatus) {
            readyStatus.lastChild.textContent = host === "Connected" && bridge === "Healthy" ? " READY" : " CHECK";
            readyStatus.classList.toggle("error", host !== "Connected" || bridge !== "Healthy");
        }
    }

    function showSummary(summary, health) {
        var projectName = summary.project ? String(summary.project).split(/[\\/]/).pop() : "Untitled Project";
        var activeName = summary.activeItem || "None";
        var project = document.getElementById("liveProjectName");
        var composition = document.getElementById("liveActiveComp");
        if (project) project.textContent = projectName;
        if (composition) composition.textContent = activeName;
        setHostState("Connected", health && health.ok ? "Healthy" : "Needs attention");
        var activeComposition = (summary.compositions || []).filter(function (item) { return item.name === activeName; })[0] || null;
        if (output) output.textContent = JSON.stringify({
            readbackAt: new Date().toISOString(),
            project: projectName,
            activeComposition: activeComposition,
            selectedLayers: summary.selectedLayers || [],
            projectItems: summary.projectItems || [],
            renderQueue: { count: summary.renderQueueCount || 0, items: summary.renderQueueItems || [] },
            health: health || null,
            workflowReceipt: lastReceipt
        }, null, 2);
    }

    function readProjectState() {
        if (!window.AEBossAgentUI || typeof window.AEBossAgentUI.readProject !== "function") {
            setHostState("Unavailable", "Agent adapter unavailable");
            log("Live project readback is unavailable in this panel.");
            return;
        }
        setHostState("Checking...", "Reading project state...");
        log("Reading project state and health directly from After Effects.");
        window.AEBossAgentUI.readProject(function (result) {
            if (!result || !result.summary || result.summary.ok === false) {
                setHostState("Not connected", result && result.summary && result.summary.message || "CEP host unavailable");
                log("Project readback failed: " + (result && result.summary && result.summary.message || "After Effects returned no project summary."));
                if (output) output.textContent = JSON.stringify(result || { ok: false, message: "No host response." }, null, 2);
                return;
            }
            showSummary(result.summary, result.health);
            if (!result.health || result.health.ok !== true) {
                log("Project state was read, but the health check reported issues.");
                return;
            }
            log("Project state and health were read from After Effects.");
        });
    }

    function renderPlan(detail) {
        if (!planList) return;
        planList.textContent = "";
        (detail.commands || []).forEach(function (command, index) {
            var item = document.createElement("li");
            item.className = "pending";
            item.setAttribute("data-plan-index", String(index));
            var payload = command.payload || {};
            var target = payload.name || payload.text || payload.path || payload.composition || "";
            item.textContent = (index + 1) + ". " + command.command + (target ? " — " + String(target).slice(0, 100) : "");
            planList.appendChild(item);
        });
        if (!planList.children.length) {
            var empty = document.createElement("li");
            empty.className = "pending";
            empty.textContent = "No executable operations were proposed.";
            planList.appendChild(empty);
        }
        log(detail.status === "approved" ? "The user approved this plan for execution." : detail.status === "proposed" ? "Execution plan is ready for approval." : "Production plan updated.");
    }

    function updateStep(detail) {
        var item = planList && planList.querySelector('[data-plan-index="' + detail.index + '"]');
        if (item) item.className = detail.status === "verified" ? "done" : detail.status;
        var message = "Step " + (detail.index + 1) + "/" + detail.total + ": " + detail.command + " — " + detail.status;
        if (detail.verification) message += " (" + detail.verification + ")";
        if (detail.message) message += ": " + detail.message;
        log(message);
    }

    document.addEventListener("aeboss:plan", function (event) { if (acceptEvent(event.detail || {})) renderPlan(event.detail || {}); });
    document.addEventListener("aeboss:step", function (event) { if (acceptEvent(event.detail || {})) updateStep(event.detail || {}); });
    document.addEventListener("aeboss:phase", function (event) {
        var detail = event.detail || {};
        if (!acceptEvent(detail, true)) return;
        if (detail.phase === "request" && detail.status === "received") lastReceipt = null;
        var messages = {
            request: "Request received",
            inspect: "Live After Effects inspection",
            plan: "Production plan",
            approval: "User approval",
            execute: "After Effects execution",
            repair: "Step repair",
            verify: "Final readback and health check",
            save: "Project file save"
        };
        if (detail.phase === "save" && detail.path) log("Project file saved and verified: " + detail.path, detail);
        else if (messages[detail.phase]) log(messages[detail.phase] + " — " + detail.status + (detail.healthStatus ? " (health: " + detail.healthStatus + ")" : "") + (detail.message ? ": " + detail.message : ""), detail);
    });
    document.addEventListener("aeboss:complete", function (event) {
        var detail = event.detail || {};
        if (!acceptEvent(detail)) return;
        log((detail.status === "verified" ? "Workflow verified" : "Workflow not complete") + (detail.message ? ": " + detail.message : ""), detail);
        showReceipt(detail);
    });
    document.addEventListener("aeboss:activity", function (event) {
        var detail = event.detail || {};
        if (acceptEvent(detail) && detail.message) log(detail.message, detail);
    });

    document.querySelectorAll("[data-live-prompt]").forEach(function (button) {
        button.addEventListener("click", function () {
            if (!window.AEBossAgentUI || !window.AEBossAgentUI.sendPrompt(button.getAttribute("data-live-prompt"))) {
                log("The Agent request interface is unavailable.");
            }
        });
    });

    var openAgent = document.getElementById("liveOpenAgent");
    if (openAgent) openAgent.addEventListener("click", function () {
        if (window.AEBossAgentUI) window.AEBossAgentUI.focusRequest();
        var input = document.getElementById("promptInput");
        if (input) input.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    var readbackButton = document.getElementById("liveReadback");
    if (readbackButton) readbackButton.addEventListener("click", readProjectState);

    var stopButton = document.getElementById("liveStop");
    if (stopButton) stopButton.addEventListener("click", function () {
        if (!window.AEBossAgentUI || !window.AEBossAgentUI.stop || !window.AEBossAgentUI.stop()) {
            log("There is no active Agent operation to stop.");
        }
    });

    restoreRun();
    if (window.__adobe_cep__) readProjectState();
    else {
        setHostState("Not connected", "CEP unavailable");
        log("Preview mode: live After Effects operations require the installed CEP panel.");
    }
})();
