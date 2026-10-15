(function () {
    "use strict";

    var shell = document.querySelector(".app-shell");
    var form = document.getElementById("chatForm");
    var input = document.getElementById("promptInput");
    var task = document.getElementById("minimalTask");
    var result = document.getElementById("minimalResult");
    var taskTitle = document.getElementById("minimalTaskTitle");
    var taskPercent = document.getElementById("minimalTaskPercent");
    var progressBar = document.getElementById("minimalProgressBar");
    var steps = document.querySelectorAll("#minimalSteps li");
    var phaseIndexes = { request: 0, inspect: 1, plan: 2, approval: 2, execute: 3, repair: 3, verify: 4, save: 5, complete: 6 };
    var currentPhaseIndex = 0;
    var phaseStates = [];
    var currentPercent = 0;
    var activeRunId = null;
    var workflowActive = false;

    function setAdvanced(open) {
        shell.classList.toggle("advanced-open", open);
        if (!open) return;
        window.setTimeout(function () {
            var closeButton = document.getElementById("advancedToggle");
            if (closeButton) closeButton.textContent = "Close advanced details";
        }, 0);
    }

    function setProgress(percent) {
        currentPercent = percent;
        if (taskPercent) taskPercent.textContent = percent + "%";
        if (progressBar) progressBar.style.width = percent + "%";
        Array.prototype.forEach.call(steps, function (step, index) {
            var state = phaseStates[index] || "pending";
            step.classList.toggle("active", state === "running" || state === "waiting");
            step.classList.toggle("done", state === "verified");
            step.classList.toggle("failed", state === "failed");
            step.classList.toggle("skipped", state === "skipped");
            step.setAttribute("data-status", state);
            step.setAttribute("aria-label", step.textContent + ": " + state);
        });
    }

    function showTask(detail) {
        if (!task || !result) return;
        result.hidden = true;
        result.classList.remove("failed");
        task.hidden = false;
        taskTitle.textContent = "Working on your project";
        currentPhaseIndex = 0;
        phaseStates = [];
        activeRunId = detail.runId || null;
        workflowActive = true;
        setProgress(0);
    }

    function updatePhase(detail) {
        if (!task || !workflowActive || (activeRunId && detail.runId !== activeRunId)) return;
        if (detail.phase === "complete") return;
        var index = phaseIndexes[detail.phase];
        if (index === undefined) return;
        currentPhaseIndex = index;
        var verified = detail.status === "verified" || detail.status === "approved" || detail.status === "received";
        if (detail.phase === "repair") verified = false;
        phaseStates[index] = verified ? "verified" : detail.status === "skipped" ? "skipped" : detail.status === "failed" ? "failed" : detail.status === "waiting" ? "waiting" : "running";
        var completed = phaseStates.filter(function (state) { return state === "verified" || state === "skipped"; }).length;
        setProgress(Math.min(99, Math.round(completed / steps.length * 100)));
        if (detail.phase === "inspect") taskTitle.textContent = "Reading the live After Effects project";
        else if (detail.phase === "plan" || detail.phase === "approval") taskTitle.textContent = detail.status === "waiting" ? "Waiting for your approval" : "Preparing the execution plan";
        else if (detail.phase === "execute") taskTitle.textContent = "Executing After Effects steps";
        else if (detail.phase === "repair") taskTitle.textContent = "Preparing a repair for the failed step";
        else if (detail.phase === "verify") taskTitle.textContent = "Checking the result in After Effects";
        else if (detail.phase === "save") taskTitle.textContent = detail.status === "skipped" ? "No project save required" : "Saving and checking the project file";
    }

    function showResult(detail) {
        var text = detail && detail.message;
        if (!task || !result || !text || !workflowActive || (activeRunId && detail.runId !== activeRunId)) return;
        workflowActive = false;
        task.hidden = true;
        result.hidden = false;
        var verified = detail.status === "verified";
        result.classList.toggle("failed", !verified);
        phaseStates[6] = verified ? "verified" : "failed";
        if (!verified && (phaseStates[currentPhaseIndex] === "running" || phaseStates[currentPhaseIndex] === "waiting")) phaseStates[currentPhaseIndex] = "failed";
        setProgress(verified ? 100 : Math.min(99, currentPercent));
        var title = document.getElementById("minimalResultTitle");
        var meta = document.getElementById("minimalResultMeta");
        var check = result.querySelector(".result-check");
        var eyebrow = result.querySelector(".eyebrow");
        if (title) title.textContent = verified ? "Your project is ready" : "The request is not verified as complete";
        if (meta) meta.textContent = text.length > 150 ? text.slice(0, 147) + "..." : text;
        if (check) {
            check.textContent = verified ? "✓" : "!";
            check.style.color = verified ? "" : "#ff8c7a";
            check.style.borderColor = verified ? "" : "#ff8c7a";
        }
        if (eyebrow) {
            eyebrow.textContent = verified ? "VERIFIED" : "NOT COMPLETE";
            eyebrow.style.color = verified ? "" : "#ff8c7a";
        }
        var viewButton = document.getElementById("minimalViewButton");
        var renderButton = document.getElementById("minimalRenderButton");
        if (viewButton) viewButton.disabled = !verified;
        if (renderButton) renderButton.disabled = !verified;
    }

    document.querySelectorAll("[data-minimal-nav]").forEach(function (button) {
        button.addEventListener("click", function () {
            var view = button.getAttribute("data-minimal-nav");
            document.querySelectorAll("[data-minimal-nav]").forEach(function (item) { item.classList.toggle("active", item === button); });
            if (view === "settings") { document.getElementById("settingsButton").click(); return; }
            if (view === "agent") {
                var open = !shell.classList.contains("advanced-open");
                setAdvanced(open);
                button.setAttribute("aria-expanded", String(open));
                if (open) {
                    var livePanel = document.getElementById("liveControlCenter");
                    if (livePanel) livePanel.scrollIntoView({ behavior: "smooth", block: "start" });
                }
                return;
            }
            if (view === "projects") input.value = "Inspect the active After Effects project";
            if (view === "assets") input.value = "Import media into the active composition";
            if (input) input.focus();
        });
    });

    document.querySelectorAll("[data-minimal-prompt]").forEach(function (button) {
        button.addEventListener("click", function () {
            input.value = button.getAttribute("data-minimal-prompt") || "";
            input.focus();
        });
    });

    ["advancedToggle", "resultAdvancedToggle"].forEach(function (id) {
        var button = document.getElementById(id);
        if (button) button.addEventListener("click", function () { setAdvanced(!shell.classList.contains("advanced-open")); });
    });

    document.addEventListener("aeboss:phase", function (event) {
        if (event.detail && event.detail.phase === "request" && event.detail.status === "received" && !workflowActive) showTask(event.detail);
        updatePhase(event.detail || {});
    });

    document.addEventListener("aeboss:complete", function (event) { showResult(event.detail || {}); });

    var viewButton = document.getElementById("minimalViewButton");
    if (viewButton) viewButton.addEventListener("click", function () { if (typeof window.hostCall === "function") window.hostCall("summary", {}, function () {}); else if (input) { input.value = "Inspect the active After Effects project"; input.focus(); } });
    var editButton = document.getElementById("minimalEditButton");
    if (editButton) editButton.addEventListener("click", function () { if (input) { input.focus(); input.select(); } });
    var renderButton = document.getElementById("minimalRenderButton");
    if (renderButton) renderButton.addEventListener("click", function () { if (input) { input.value = "Render the active composition"; form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); } });
})();
