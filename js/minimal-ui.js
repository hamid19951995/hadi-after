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
    var observer;

    function setAdvanced(open) {
        shell.classList.toggle("advanced-open", open);
        if (!open) return;
        window.setTimeout(function () {
            var closeButton = document.getElementById("advancedToggle");
            if (closeButton) closeButton.textContent = "Close advanced details";
        }, 0);
    }

    function setProgress(percent, activeIndex) {
        if (taskPercent) taskPercent.textContent = percent + "%";
        if (progressBar) progressBar.style.width = percent + "%";
        Array.prototype.forEach.call(steps, function (step, index) {
            step.classList.toggle("active", index === activeIndex);
            step.classList.toggle("done", index < activeIndex);
        });
    }

    function showTask() {
        if (!task || !result) return;
        result.hidden = true;
        task.hidden = false;
        taskTitle.textContent = "Working on your project";
        setProgress(18, 0);
        window.setTimeout(function () { setProgress(42, 1); }, 900);
        window.setTimeout(function () { setProgress(68, 2); }, 1800);
    }

    function showResult(text) {
        if (!task || !result || !text) return;
        task.hidden = true;
        result.hidden = false;
        setProgress(100, steps.length);
        var title = document.getElementById("minimalResultTitle");
        var meta = document.getElementById("minimalResultMeta");
        if (title) title.textContent = "Your project is ready";
        if (meta) meta.textContent = text.length > 150 ? text.slice(0, 147) + "..." : text;
    }

    document.querySelectorAll("[data-minimal-nav]").forEach(function (button) {
        button.addEventListener("click", function () {
            var view = button.getAttribute("data-minimal-nav");
            document.querySelectorAll("[data-minimal-nav]").forEach(function (item) { item.classList.toggle("active", item === button); });
            if (view === "settings") { document.getElementById("settingsButton").click(); return; }
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

    if (form) form.addEventListener("submit", showTask);
    if (input) input.addEventListener("focus", function () { if (result.hidden) task.hidden = true; });

    var messages = document.getElementById("messages");
    if (messages && typeof MutationObserver !== "undefined") {
        observer = new MutationObserver(function () {
            var assistantMessages = messages.querySelectorAll(".message.assistant .bubble");
            if (assistantMessages.length > 1) showResult(assistantMessages[assistantMessages.length - 1].textContent || "Verified After Effects changes completed.");
        });
        observer.observe(messages, { childList: true, subtree: true });
    }

    var viewButton = document.getElementById("minimalViewButton");
    if (viewButton) viewButton.addEventListener("click", function () { if (typeof window.hostCall === "function") window.hostCall("summary", {}, function () {}); else if (input) { input.value = "Inspect the active After Effects project"; input.focus(); } });
    var editButton = document.getElementById("minimalEditButton");
    if (editButton) editButton.addEventListener("click", function () { if (input) { input.focus(); input.select(); } });
    var renderButton = document.getElementById("minimalRenderButton");
    if (renderButton) renderButton.addEventListener("click", function () { if (input) { input.value = "Render the active composition"; form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); } });
})();
