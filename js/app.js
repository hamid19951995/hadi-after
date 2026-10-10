(function () {
    "use strict";

    var isCep = typeof window.__adobe_cep__ !== "undefined" && typeof CSInterface !== "undefined";
    var messages = document.getElementById("messages");
    var input = document.getElementById("promptInput");
    var form = document.getElementById("chatForm");
    var modeLabel = document.getElementById("modeLabel");
    var connectionStatus = document.getElementById("connectionStatus");
    var statusRow = document.querySelector(".status-row");
    var connectCopilot = document.getElementById("connectCopilot");
    var tokenUsage = document.getElementById("tokenUsage");
    var languageButton = document.getElementById("languageButton");
    var chatModeInput = document.getElementById("chatMode");
    var settingsModal = document.getElementById("settingsModal");
    var endpointInput = document.getElementById("endpointInput");
    var modelInput = document.getElementById("modelInput");
    var apiKeyInput = document.getElementById("apiKeyInput");
    var tokenBudgetInput = document.getElementById("tokenBudgetInput");
    var providerTypeInput = document.getElementById("providerTypeInput");
    var offlineModeInput = document.getElementById("offlineModeInput");
    var offlineFirst = window.localStorage.getItem("aeBossOfflineMode") !== "off";
    var offlineContextState = JSON.parse(window.localStorage.getItem("aeBossOfflineContext") || "null") || {};
    var temperatureInput = document.getElementById("temperatureInput");
    var modelHelp = document.getElementById("modelHelp");
    var pending = false;
    var provider = JSON.parse(window.localStorage.getItem("aeStudioProvider") || "null") || { type: "offline", endpoint: "", model: "local", apiKey: "", tokenBudget: 0, temperature: 0.1 };
    var providerProfiles = JSON.parse(window.localStorage.getItem("aeStudioProviderProfiles") || "{}");
    var providerDefaults = {
        offline: { endpoint: "", placeholder: "Offline Core — Python stdlib, no network" },
        auto: { endpoint: "http://127.0.0.1:43127/v1/chat/completions", placeholder: "Auto: local runtime or bridge" },
        ollama: { endpoint: "http://127.0.0.1:43127/v1/chat/completions", placeholder: "Ollama is routed through the local bridge" },
        gpt4all: { endpoint: "http://127.0.0.1:43127/v1/chat/completions", placeholder: "GPT4All is routed through the local bridge" },
        "lm-studio": { endpoint: "http://127.0.0.1:43127/v1/chat/completions", placeholder: "LM Studio is routed through the local bridge" },
        hadi: { endpoint: "http://127.0.0.1:43127/v1/chat/completions", placeholder: "HADI bridge endpoint" },
        copilot: { endpoint: "http://127.0.0.1:43127/v1/chat/completions", placeholder: "Copilot bridge endpoint" },
        openai: { endpoint: "https://api.openai.com/v1/chat/completions", models: "https://api.openai.com/v1/models", placeholder: "https://api.openai.com/v1/chat/completions" },
        openrouter: { endpoint: "https://openrouter.ai/api/v1/chat/completions", models: "https://openrouter.ai/api/v1/models", placeholder: "https://openrouter.ai/api/v1/chat/completions" },
        anthropic: { endpoint: "https://api.anthropic.com/v1/messages", models: "https://api.anthropic.com/v1/models", placeholder: "https://api.anthropic.com/v1/messages" },
        google: { endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent", models: "https://generativelanguage.googleapis.com/v1beta/models", placeholder: "Gemini generateContent endpoint" },
        "openai-compatible": { endpoint: "", placeholder: "https://your-provider.example/v1/chat/completions" }
    };
    var language = window.localStorage.getItem("aeStudioLanguage") || "en";
    var chatMode = window.localStorage.getItem("aeStudioChatMode") || "agent";
    function uiText(english, persian) { return language === "fa" ? persian : english; }
    function bilingualText(selector, english, persian, html) {
        var element = document.querySelector(selector);
        if (element) element[html ? "innerHTML" : "textContent"] = language === "fa" ? persian : english;
    }
    function applyLanguage() {
        var persian = language === "fa";
        document.documentElement.lang = persian ? "fa" : "en";
        document.body.dir = persian ? "rtl" : "ltr";
        document.querySelector(".app-shell").dir = persian ? "rtl" : "ltr";
        languageButton.textContent = persian ? "English" : "فارسی";
        languageButton.title = persian ? "تغییر زبان" : "Switch language";
        bilingualText(".brand-copy span", "Creative production workspace", "فضای تولید خلاقانه");
        bilingualText(".status-row #connectionStatus", "Connected to After Effects", "به After Effects متصل است");
        bilingualText(".meter-label", "COPILOT", "کوپایلوت");
        var sidebarLabels = language === "fa" ? ["استودیو", "پروژه"] : ["STUDIO", "PROJECT"];
        document.querySelectorAll(".sidebar-label").forEach(function (item, index) { if (sidebarLabels[index]) item.textContent = sidebarLabels[index]; });
        bilingualText("#sidebarProjectName", "Untitled project", "پروژه بدون نام");
        bilingualText("#sidebarProjectMeta", "Ready for a new scene", "آماده برای صحنه جدید");
        var navText = language === "fa" ? [["ساخت", "سازنده پروژه هوشمند"], ["متحرک‌سازی", "حرکت و زمان‌بندی"], ["دارایی‌ها", "وارد کردن و تولید"], ["رندر", "صف و خروجی"]] : [["Create", "AI project builder"], ["Animate", "Motion and timing"], ["Assets", "Import and generate"], ["Render", "Queue and export"]];
        document.querySelectorAll(".studio-nav").forEach(function (item, index) { if (navText[index]) { item.querySelector("b").textContent = navText[index][0]; item.querySelector("small").textContent = navText[index][1]; } });
        var links = language === "fa" ? ["◈ بررسی پروژه فعال", "↧ ذخیره پروژه"] : ["◈ Inspect active project", "↧ Save project"];
        document.querySelectorAll(".sidebar-link").forEach(function (item, index) { if (links[index]) item.textContent = links[index]; });
        bilingualText(".studio-overview .eyebrow", "AI PRODUCTION STUDIO", "استودیو تولید هوشمند");
        bilingualText(".studio-overview h2", "Turn an idea into a scene.", "ایده‌تان را به یک صحنه تبدیل کنید.");
        bilingualText(".studio-overview p:not(.eyebrow)", "Build, animate, and prepare After Effects compositions with one conversational workspace.", "ساخت، متحرک‌سازی و آماده‌سازی کامپوزیشن‌های After Effects در یک فضای گفت‌وگومحور.");
        bilingualText("#studioActivity", "Ready for your next creative action.", "آماده‌ی اقدام خلاقانه بعدی شما.");
        var statLabels = language === "fa" ? ["صحنه", "لایه‌ها", "در صف"] : ["SCENE", "LAYERS", "QUEUED"];
        document.querySelectorAll(".overview-stats span").forEach(function (item, index) { if (statLabels[index]) item.textContent = statLabels[index]; });
        bilingualText(".hero-intro .eyebrow", "YOUR CREATIVE COPILOT", "دستیار خلاق شما");
        bilingualText(".hero-intro h1", "What are we<br><em>making</em> today?", "امروز چه چیزی<br><em>می‌سازیم</em>؟", true);
        bilingualText(".intro-copy", "Describe a composition, animation, or workflow. AE Studio turns your intent into an editable After Effects project.", "کامپوزیشن، انیمیشن یا روند کاری خود را توضیح دهید؛ AE Studio ایده شما را به پروژه‌ای قابل ویرایش در After Effects تبدیل می‌کند.");
        var actions = language === "fa" ? [["پروژه جدید", "ساخت کامپوزیشن"], ["افزودن متن", "ساخت لایه متن"], ["بررسی پروژه", "مشاهده وضعیت فعلی"], ["تیزر صوتی", "تولید صدا و صحنه"], ["یادگیری روند کار", "راهنمای پروژه"]] : [["New project", "Set up a composition"], ["Add text", "Build a text layer"], ["Inspect project", "See active context"], ["Audio teaser", "Generate sound and scene"], ["Learn workflow", "Project guide"]];
        document.querySelectorAll(".action-card").forEach(function (item, index) { if (actions[index]) { item.querySelector("b").textContent = actions[index][0]; item.querySelector("small").textContent = actions[index][1]; } });
        var tools = language === "fa" ? [["سازنده صحنه", "ساخت کامپوزیشن آماده تولید"], ["حرکت‌گذاری", "افزودن انیمیشن ورود"], ["وارد کردن دارایی", "افزودن رسانه به صحنه"]] : [["Scene builder", "Generate a production-ready composition"], ["Motion pass", "Add a clean entrance animation"], ["Asset import", "Bring footage into the active scene"]];
        document.querySelectorAll(".tool-card").forEach(function (item, index) { if (tools[index]) { item.querySelector("b").textContent = tools[index][0]; item.querySelector("small").textContent = tools[index][1]; } });
        bilingualText(".chat-header span", "Conversation", "گفت‌وگو");
        if (chatModeInput) {
            chatModeInput.options[0].textContent = persian ? "پرسش" : "Ask";
            chatModeInput.options[1].textContent = persian ? "عامل" : "Agent";
            chatModeInput.options[2].textContent = persian ? "اسکریپت" : "Script";
            chatModeInput.title = persian ? "حالت گفتگو" : "Chat mode";
            chatModeInput.setAttribute("aria-label", persian ? "حالت گفتگو" : "Chat mode");
        }
        bilingualText("#journalButton", "History", "تاریخچه");
        bilingualText("#clearButton", "Clear", "پاک‌کردن");
        bilingualText("#messages .message.assistant:first-child .bubble", "Hi. I can create compositions, add layers, inspect your project, or run ExtendScript. What should we make?", "سلام. می‌توانم کامپوزیشن بسازم، لایه اضافه کنم، پروژه را بررسی کنم یا ExtendScript اجرا کنم. چه چیزی بسازیم؟");
        input.placeholder = persian ? "آنچه می‌خواهید بسازید را توضیح دهید..." : "Describe what you want to create...";
        input.setAttribute("aria-label", persian ? "پیام" : "Message");
        bilingualText(".hint", "Enter to send · Shift+Enter for new line", "Enter برای ارسال · Shift+Enter برای خط جدید");
        document.getElementById("attachButton").title = persian ? "وارد کردن تصویر یا ویدیو" : "Import image or video";
        document.getElementById("attachButton").setAttribute("aria-label", persian ? "وارد کردن تصویر یا ویدیو" : "Import image or video");
        document.querySelector(".send-button").title = persian ? "ارسال پیام" : "Send message";
        document.querySelector(".send-button").setAttribute("aria-label", persian ? "ارسال پیام" : "Send message");
        bilingualText(".footer span:first-child", "Offline Core ready", "هسته آفلاین آماده است");
        bilingualText("#modeLabel", offlineFirst ? "OFFLINE CORE" : "MOCK MODE", offlineFirst ? "هسته آفلاین" : "حالت آزمایشی");
        bilingualText(".settings-heading .eyebrow", "CONNECTION", "اتصال");
        bilingualText("#settingsTitle", "AI provider", "سرویس‌دهنده هوش مصنوعی");
        document.getElementById("settingsButton").title = persian ? "تنظیمات" : "Settings";
        document.getElementById("settingsButton").setAttribute("aria-label", persian ? "تنظیمات" : "Settings");
        document.getElementById("closeSettings").setAttribute("aria-label", persian ? "بستن تنظیمات" : "Close settings");
        var labels = language === "fa" ? ["سرویس‌دهنده", "نام مدل", "نشانی گفت‌وگو", "کلید API", "هسته آفلاین", "سقف توکن جلسه", "دما"] : ["Provider", "Model name", "Chat endpoint", "API key", "Offline Core", "Session token budget", "Temperature"];
        document.querySelectorAll(".settings-modal > label").forEach(function (item, index) { if (labels[index]) item.childNodes[0].nodeValue = labels[index] + " "; });
        document.querySelectorAll(".optional").forEach(function (item, index) { item.textContent = language === "fa" ? (index === 0 ? "لازم برای سرویس‌های ابری" : "اختیاری") : (index === 0 ? "required for cloud providers" : "optional"); });
        bilingualText("#modelHelp", "Only models reported by the selected provider are shown. Cloud providers require an API key.", "فقط مدل‌های سرویس‌دهنده انتخاب‌شده نمایش داده می‌شوند. سرویس‌های ابری به کلید API نیاز دارند.");
        bilingualText("#refreshModels", "Refresh models", "به‌روزرسانی مدل‌ها");
        bilingualText("#githubCopilotLink", "Open GitHub Copilot", "باز کردن GitHub Copilot");
        bilingualText("#hadiPreset", "Use HADI", "استفاده از HADI");
        bilingualText("#copilotPreset", "Use VS Code Copilot", "استفاده از VS Code Copilot");
        bilingualText("#resetSettings", "Use local commands", "استفاده از فرمان‌های محلی");
        bilingualText("#saveSettings", "Save connection", "ذخیره اتصال");
        endpointInput.placeholder = persian ? "نشانی اتصال سرویس‌دهنده" : "Provider chat endpoint";
        apiKeyInput.placeholder = persian ? "کلید فقط در این پنل ذخیره می‌شود" : "Stored only in this panel";
        tokenBudgetInput.placeholder = persian ? "بدون محدودیت" : "No limit";
        var options = { offline: ["هسته آفلاین (Python)", "Offline Core (Python)"], auto: ["تشخیص خودکار هوش محلی", "Auto detect local AI"], ollama: ["Ollama", "Ollama"], gpt4all: ["GPT4All", "GPT4All"], "lm-studio": ["LM Studio", "LM Studio"], hadi: ["HADI (VS Code)", "HADI (VS Code)"], copilot: ["GitHub Copilot (VS Code)", "GitHub Copilot (VS Code)"], openai: ["OpenAI", "OpenAI"], openrouter: ["OpenRouter", "OpenRouter"], anthropic: ["Anthropic Claude", "Anthropic Claude"], google: ["Google Gemini", "Google Gemini"], "openai-compatible": ["OpenAI-compatible", "OpenAI-compatible"] };
        Array.prototype.forEach.call(providerTypeInput.options, function (option) { if (options[option.value]) option.textContent = options[option.value][persian ? 0 : 1]; });
    }
    applyLanguage();
    if (chatModeInput) {
        chatModeInput.value = chatMode;
        chatModeInput.addEventListener("change", function () {
            chatMode = chatModeInput.value || "agent";
            window.localStorage.setItem("aeStudioChatMode", chatMode);
            setStudioActivity(chatMode === "ask" ? uiText("Ask mode: no After Effects changes will be executed.", "حالت پرسش: هیچ تغییری در After Effects اجرا نمی‌شود.") : chatMode === "script" ? uiText("Script mode: complex requests will prefer ExtendScript.", "حالت اسکریپت: درخواست‌های پیچیده با ExtendScript انجام می‌شوند.") : uiText("Agent mode: plans require confirmation before changes.", "حالت عامل: برنامه‌ها قبل از تغییر نیاز به تأیید دارند."), "success");
        });
    }
    languageButton.addEventListener("click", function () { language = language === "fa" ? "en" : "fa"; window.localStorage.setItem("aeStudioLanguage", language); applyLanguage(); });
    var conversation = JSON.parse(window.localStorage.getItem("aeStudioConversation") || "null") || [];
    var tokenTotals = JSON.parse(window.localStorage.getItem("aeStudioTokenTotals") || "null") || { prompt: 0, completion: 0, total: 0, estimated: false };
    var operationJournal = JSON.parse(window.localStorage.getItem("aeStudioOperationJournal") || "null") || [];
    var lastWorkflowPlan = null;
    var activeOperationId = null;
    var bridgeMemoryEndpoint = "http://127.0.0.1:43127/v1/memory";
    var bridgeChatEndpoint = "http://127.0.0.1:43127/v1/chat/completions";
    var bridgeRepositorySearchEndpoint = "http://127.0.0.1:43127/v1/repository/search";
    var localProviderTypes = ["offline", "auto", "ollama", "gpt4all", "lm-studio", "hadi", "copilot"];
    function isLocalProvider(type) { return localProviderTypes.indexOf(type || "auto") >= 0; }
    function updateCredentialFields(type) {
        var local = isLocalProvider(type);
        apiKeyInput.disabled = local;
        if (local) apiKeyInput.value = "";
        apiKeyInput.parentElement.style.display = local ? "none" : "";
        endpointInput.readOnly = local;
        endpointInput.title = local ? uiText("Managed by the local bridge", "توسط پل محلی مدیریت می‌شود") : "";
    }
    endpointInput.value = provider.endpoint;
    modelInput.value = provider.model;
    apiKeyInput.value = provider.apiKey;
    tokenBudgetInput.value = provider.tokenBudget || "";
    providerTypeInput.value = provider.type || (offlineFirst ? "offline" : "auto");
        if (offlineModeInput) offlineModeInput.value = offlineFirst ? "on" : "off";
    temperatureInput.value = provider.temperature === undefined ? 0.1 : provider.temperature;
    providerTypeInput.dataset.loadedType = provider.type || "auto";
    updateCredentialFields(provider.type || "auto");
    function saveProviderProfile(type) {
        var selectedType = type || "auto";
        providerProfiles[selectedType] = {
            endpoint: endpointInput.value.trim(),
            model: modelInput.value,
            apiKey: isLocalProvider(selectedType) ? "" : apiKeyInput.value,
            tokenBudget: Number(tokenBudgetInput.value) || 0,
            temperature: Number(temperatureInput.value) || 0.1
        };
        window.localStorage.setItem("aeStudioProviderProfiles", JSON.stringify(providerProfiles));
    }
    function loadProviderProfile(type) {
        var profile = providerProfiles[type];
        var defaults = providerDefaults[type] || {};
        endpointInput.value = defaults.endpoint || "";
        modelInput.value = "";
        apiKeyInput.value = "";
        tokenBudgetInput.value = "";
        temperatureInput.value = "0.1";
        if (profile) {
            endpointInput.value = profile.endpoint || "";
            modelInput.value = profile.model || "";
            apiKeyInput.value = profile.apiKey || "";
            tokenBudgetInput.value = profile.tokenBudget || "";
            temperatureInput.value = profile.temperature === undefined ? 0.1 : profile.temperature;
        }
        providerTypeInput.dataset.loadedType = type;
        endpointInput.placeholder = uiText((providerDefaults[type] || {}).placeholder || "Provider chat endpoint", "نشانی اتصال سرویس‌دهنده");
        updateCredentialFields(type);
        refreshModels();
    }

    if (isCep) {
        modeLabel.textContent = offlineFirst ? uiText("OFFLINE CORE", "هسته آفلاین") : uiText("LIVE BRIDGE", "پل زنده");
        connectionStatus.textContent = uiText("Connected to After Effects", "به After Effects متصل است");
    }

    function openCopilotLogin() {
        var url = "https://github.com/login?return_to=%2Ffeatures%2Fcopilot";
        if (window.cep && window.cep.util && typeof window.cep.util.openURLInDefaultBrowser === "function") window.cep.util.openURLInDefaultBrowser(url);
        else window.open(url, "_blank");
    }

    function providerMatches(item, selectedType) {
        var id = String(item.id || "").toLowerCase();
        if (selectedType === "copilot") return id === "copilot" || id === "github-copilot";
        return id === String(selectedType || "auto").toLowerCase();
    }

    function refreshModels() {
        var selectedType = providerTypeInput.value || (offlineFirst ? "offline" : "auto");
        if (selectedType === "offline" || (offlineModeInput ? offlineModeInput.value !== "off" : offlineFirst)) { setModelOptions([{ value: "offline", label: "offline / Python Core" }], "offline"); return Promise.resolve(); }
        fetch("http://127.0.0.1:43127/health").then(function (response) { return response.json(); }).then(function (health) {
            var options = [];
            (health.providers || []).filter(function (item) { return selectedType === "auto" || providerMatches(item, selectedType); }).forEach(function (item) { (item.models || []).forEach(function (model) { options.push({ value: model, label: item.id + " / " + model }); }); });
            if (selectedType === "copilot" || selectedType === "auto") (health.copilotModels || []).forEach(function (model) { options.push({ value: model.id || model.family, label: "github-copilot / " + (model.name || model.family || model.id) }); });
            if (selectedType === "hadi" || selectedType === "auto") (health.hadiModels || []).forEach(function (model) { options.push({ value: model.id || model.family, label: "hadi / " + (model.name || model.family || model.id) }); });
            if (options.length || ["auto", "ollama", "gpt4all", "lm-studio", "hadi", "copilot"].indexOf(selectedType) >= 0) return setModelOptions(options, selectedType);
            return fetchRemoteModels(selectedType).then(function (remoteOptions) { setModelOptions(remoteOptions, selectedType); });
        }).catch(function () {
            if (["auto", "ollama", "gpt4all", "lm-studio", "hadi", "copilot"].indexOf(selectedType) >= 0) modelHelp.textContent = uiText("Bridge not found. Start the selected local provider and refresh models.", "پل پیدا نشد. سرویس‌دهنده محلی را اجرا کنید و مدل‌ها را دوباره به‌روزرسانی کنید.");
            else fetchRemoteModels(selectedType).then(function (options) { setModelOptions(options, selectedType); }).catch(function (error) {
                setModelOptions([], selectedType);
                modelHelp.textContent = error.message;
            });
        });
    }

    function setModelOptions(options, selectedType) {
            var currentModel = modelInput.value || provider.model;
            modelInput.innerHTML = "";
            options.forEach(function (option) { var element = document.createElement("option"); element.value = option.value; element.textContent = option.label; modelInput.appendChild(element); });
            if (!options.length) { var empty = document.createElement("option"); empty.value = ""; empty.textContent = uiText("No model reported by ", "مدلی از ") + selectedType; modelInput.appendChild(empty); modelHelp.textContent = uiText("No model was reported by this provider. Check the endpoint and API key.", "مدلی از این سرویس‌دهنده گزارش نشد. نشانی اتصال و کلید API را بررسی کنید."); return; }
            var selected = options.some(function (option) { return option.value === currentModel; }) ? currentModel : options[0].value;
            modelInput.value = selected;
            modelHelp.textContent = uiText("Available models: " + options.length + ". The selected model is used for the next request.", "تعداد مدل‌های موجود: " + options.length + "؛ مدل انتخاب‌شده برای درخواست بعدی استفاده می‌شود.");
    }

    function fetchRemoteModels(selectedType) {
        var config = providerDefaults[selectedType] || providerDefaults["openai-compatible"];
        var endpoint = config.models || (endpointInput.value || "").replace(/\/chat\/completions\/?$/, "/models").replace(/\/messages\/?$/, "/models").replace(/\/generateContent\/?$/, "");
        if (!endpoint) return Promise.reject(new Error("Enter a model or chat endpoint for " + selectedType + "."));
        var headers = { "Content-Type": "application/json" };
        if (apiKeyInput.value) headers.Authorization = "Bearer " + apiKeyInput.value;
        if (selectedType === "openrouter") {
            headers["HTTP-Referer"] = window.location.href;
            headers["X-Title"] = "AE Studio";
        }
        if (selectedType === "anthropic") { headers["x-api-key"] = apiKeyInput.value; headers["anthropic-version"] = "2023-06-01"; delete headers.Authorization; }
        if (selectedType === "google") endpoint += (endpoint.indexOf("?") >= 0 ? "&" : "?") + "key=" + encodeURIComponent(apiKeyInput.value);
        return fetch(endpoint, { headers: headers }).then(function (response) { return response.json().then(function (body) { if (!response.ok) throw new Error(body.error && (body.error.message || body.error) || "Model request failed (" + response.status + ")."); return body; }); }).then(function (body) {
            var models = body.data || body.models || [];
            if (selectedType === "google" && Array.isArray(body.models)) models = body.models.filter(function (item) { return !item.supportedGenerationMethods || item.supportedGenerationMethods.indexOf("generateContent") >= 0; });
            return models.map(function (item) { return { value: item.id || item.name || "", label: selectedType + " / " + (item.id || item.name) }; }).filter(function (item) { return item.value; });
        });
    }

    function setCopilotStatus(ready) {
        statusRow.classList.toggle("copilot-ready", ready);
        statusRow.classList.toggle("copilot-missing", !ready);
        connectCopilot.textContent = ready ? uiText("Connected", "متصل") : uiText("Connect", "اتصال");
        connectCopilot.title = ready ? uiText("The selected AI provider is connected through VS Code", "سرویس‌دهنده انتخاب‌شده از طریق VS Code متصل است") : uiText("Connect HADI or GitHub Copilot through VS Code", "اتصال HADI یا GitHub Copilot از طریق VS Code");
    }

    function providerLabel(health) {
        if (!health) return "AI provider";
        if (health.provider === "hadi") return "HADI";
        if (health.provider === "github-copilot") return "GitHub Copilot";
        return health.provider;
    }

    function refreshCopilotStatus() {
        fetch("http://127.0.0.1:43127/health").then(function (response) { return response.ok ? response.json() : null; }).then(function (health) {
            var expectedProvider = provider.type && provider.type !== "auto" ? provider.type : null;
            var providerMatches = !expectedProvider || health && (expectedProvider === "copilot" ? (health.copilotModels || []).length > 0 : expectedProvider === "hadi" ? (health.hadiModels || []).length > 0 : health.provider === expectedProvider);
            if (health && health.ok && providerMatches) {
                var languageModelProvider = expectedProvider === "copilot" || expectedProvider === "hadi";
                var activeProvider = expectedProvider === "copilot" ? "github-copilot" : expectedProvider === "hadi" ? "hadi" : health.provider;
                setCopilotStatus(true);
                modeLabel.textContent = !languageModelProvider && health.source === "local-runtime" ? uiText("LOCAL AI READY", "هوش محلی آماده است") : providerLabel({ provider: activeProvider }).toUpperCase() + " " + uiText("READY", "آماده");
                connectionStatus.textContent = !languageModelProvider && health.source === "local-runtime" ? uiText("Connected to ", "متصل به ") + health.provider : uiText("Connected to ", "متصل به ") + providerLabel({ provider: activeProvider });
            } else {
                setCopilotStatus(false);
                connectionStatus.textContent = expectedProvider === "hadi" ? uiText("Start HADI in VS Code", "HADI را در VS Code اجرا کنید") : isCep ? uiText("Connected to After Effects", "به After Effects متصل است") : uiText("Bridge not running", "پل اجرا نیست");
            }
        }).catch(function () {
            if (!provider.endpoint) setCopilotStatus(false);
        });
    }

    function probeCopilot() {
        if (provider.type && ["auto", "offline", "copilot", "hadi"].indexOf(provider.type) < 0) return Promise.resolve(false);
        return fetch("http://127.0.0.1:43127/health").then(function (response) { return response.ok ? response.json() : null; }).then(function (health) {
            if (!health || !health.provider) return;
            var preferredProvider = ["copilot", "hadi"].indexOf(provider.type) >= 0 ? provider.type : null;
            var preferredModels = preferredProvider === "copilot" ? health.copilotModels || [] : preferredProvider === "hadi" ? health.hadiModels || [] : [];
            if (preferredProvider && !preferredModels.length) return false;
            var activeProvider = preferredProvider || health.provider;
            var activeModel = health.model || "auto";
            if (preferredProvider) {
                var currentModelAvailable = preferredModels.some(function (model) { return model.id === provider.model || model.family === provider.model; });
                activeModel = currentModelAvailable ? provider.model : preferredModels[0].id || preferredModels[0].family || "auto";
            }
            provider = { type: activeProvider, endpoint: "http://127.0.0.1:43127/v1/chat/completions", model: activeModel, apiKey: "", temperature: 0.1 };
            endpointInput.value = provider.endpoint;
            modelInput.value = provider.model;
            providerTypeInput.value = provider.type;
            updateCredentialFields(provider.type);
            window.localStorage.setItem("aeStudioProvider", JSON.stringify(provider));
            modeLabel.textContent = health.source === "local-runtime" ? uiText("LOCAL AI READY", "هوش محلی آماده است") : providerLabel(health).toUpperCase() + " " + uiText("READY", "آماده");
            connectionStatus.textContent = health.source === "local-runtime" ? uiText("Connected to ", "متصل به ") + health.provider : uiText("Connected to ", "متصل به ") + providerLabel(health);
            setCopilotStatus(true);
            addMessage(providerLabel(health) + " bridge detected and connected automatically.", "assistant");
            return true;
        }).catch(function () { return false; });
    }

    if (!offlineFirst && (!provider.endpoint || provider.type === "auto") && ["copilot", "hadi"].indexOf(provider.type) < 0) {
        probeCopilot();
    }
    refreshModels();
    window.setInterval(refreshCopilotStatus, 15000);

    function updateStudioSummary(summary) {
        var compositions = summary && summary.compositions || [];
        var selectedLayers = summary && summary.selectedLayers || [];
        var layerCount = summary && summary.layerCount !== undefined ? summary.layerCount : selectedLayers.length;
        var renderQueueCount = summary && summary.renderQueueCount !== undefined ? summary.renderQueueCount : 0;
        var projectName = summary && summary.project ? String(summary.project).split(/[\\/]/).pop() : "Untitled project";
        var projectNode = document.getElementById("sidebarProjectName");
        var metaNode = document.getElementById("sidebarProjectMeta");
        var sceneNode = document.getElementById("sceneStat");
        var layerNode = document.getElementById("layerStat");
        if (projectNode) projectNode.textContent = projectName;
        if (metaNode) metaNode.textContent = summary && summary.activeItem ? summary.activeItem : uiText("Ready for a new scene", "آماده برای صحنه جدید");
        if (sceneNode) sceneNode.textContent = String(Math.max(1, compositions.length)).padStart(2, "0");
        if (layerNode) layerNode.textContent = String(layerCount).padStart(2, "0");
        var renderNode = document.getElementById("renderStat");
        if (renderNode) renderNode.textContent = String(renderQueueCount).padStart(2, "0");
    }

    hostCall("summary", {}, updateStudioSummary);

    function setStudioActivity(message, state) {
        var activity = document.getElementById("studioActivity");
        if (!activity) return;
        activity.textContent = message;
        activity.className = "studio-activity" + (state ? " " + state : "");
    }

    function refreshStudioSummary() {
        hostCall("summary", {}, updateStudioSummary);
    }

    var projectSummaryPollInFlight = false;
    function pollStudioSummary() {
        if (!isCep || document.hidden || pending || projectSummaryPollInFlight) return;
        projectSummaryPollInFlight = true;
        hostCall("summary", {}, function (summary) {
            projectSummaryPollInFlight = false;
            if (summary && summary.ok !== false) updateStudioSummary(summary);
        });
    }

    window.setInterval(pollStudioSummary, 10000);
    window.addEventListener("focus", pollStudioSummary);
    document.addEventListener("visibilitychange", function () {
        if (!document.hidden) pollStudioSummary();
    });

    function addMessage(text, role, persist) {
        text = localizeUiMessage(String(text));
        var row = document.createElement("div");
            row.className = "message " + role;
        var avatar = document.createElement("div");
        avatar.className = "avatar";
        avatar.textContent = role === "assistant" ? "✦" : uiText("You", "شما");
        var bubble = document.createElement("div");
        bubble.className = "bubble";
        bubble.textContent = text;
        row.appendChild(avatar);
        row.appendChild(bubble);
        messages.appendChild(row);
        messages.scrollTop = messages.scrollHeight;
        if (persist !== false) {
            conversation.push({ text: text, role: role });
            window.localStorage.setItem("aeStudioConversation", JSON.stringify(conversation.slice(-40)));
        }
    }

    function recordOperation(entry) {
        operationJournal.push(Object.assign({ id: activeOperationId || ("op-" + Date.now()), createdAt: new Date().toISOString() }, entry));
        operationJournal = operationJournal.slice(-100);
        window.localStorage.setItem("aeStudioOperationJournal", JSON.stringify(operationJournal));
    }

    function showOperationJournal() {
        if (!operationJournal.length) {
            addMessage(uiText("No AI operations have been recorded yet.", "هنوز عملیاتی ثبت نشده است."), "assistant");
            return;
        }
        var recent = operationJournal.slice(-12).map(function (entry) {
            var commandText = entry.command || (entry.commands || []).map(function (command) { return command.command; }).join(", ");
            return new Date(entry.createdAt).toLocaleTimeString() + " | " + (entry.status || "recorded") + " | " + commandText + (entry.message ? " | " + entry.message : "");
        }).join("\n");
        addMessage(uiText("Operation history:\n" + recent, "تاریخچه عملیات:\n" + recent), "assistant");
    }

    function formatWorkflowPlan(plan) {
        if (!plan || !plan.ok) return uiText("The workflow plan could not be created.", "برنامه روند کاری ساخته نشد.");
        lastWorkflowPlan = plan;
        var phases = (plan.phases || []).map(function (phase, index) { return (index + 1) + ". " + phase; }).join("\n");
        var commands = (plan.recommendedCommands || []).map(function (step, index) { return (index + 1) + ". " + step.command; }).join(", ");
        return uiText("Workflow plan\n\nGoal: " + plan.goal + "\n\nPhases:\n" + phases + "\n\nSuggested command sequence:\n" + commands + "\n\nNo After Effects changes were made. Ask me to execute the plan when you are ready.", "برنامه روند کاری\n\nهدف: " + plan.goal + "\n\nمراحل:\n" + phases + "\n\nفرمان‌های پیشنهادی:\n" + commands + "\n\nهیچ تغییری در After Effects انجام نشد. برای اجرا، درخواست اجرای برنامه را ارسال کنید.");
    }

    document.getElementById("journalButton").addEventListener("click", showOperationJournal);

    function localizeUiMessage(text) {
        if (language !== "fa") return text;
        if (/Failed to authenticate request with Clerk|No cookie auth credentials found/i.test(text)) return "احراز هویت سرویس ناموفق بود. سرویس‌دهنده و کلید API انتخاب‌شده را بررسی کنید.";
        if (/No local AI found/i.test(text)) return "هوش مصنوعی محلی پیدا نشد. سرویس‌دهنده محلی انتخاب‌شده را اجرا کنید یا provider دیگری انتخاب کنید.";
        if (text === "AI provider connected. I will use it for requests I cannot handle locally.") return "سرویس‌دهنده هوش مصنوعی متصل شد؛ برای درخواست‌هایی که محلی انجام نمی‌شوند از آن استفاده می‌کنم.";
        if (/bridge detected and connected automatically/i.test(text)) return text.replace(/bridge detected and connected automatically/i, "پل به‌طور خودکار شناسایی و متصل شد");
        if (text === "Asking your AI provider…") return "در حال پرسش از سرویس‌دهنده هوش مصنوعی…";
        if (text === "No provider configured.") return "هیچ سرویس‌دهنده‌ای تنظیم نشده است.";
        return text;
    }

    function syncSharedMemory(role, text) {
        if (!text) return;
        fetch(bridgeMemoryEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entries: [{ role: role, text: String(text) }] }) }).catch(function () {});
    }

    function readSharedMemory() {
        return fetch(bridgeMemoryEndpoint).then(function (response) { return response.ok ? response.json() : { entries: [] }; }).catch(function () { return { entries: [] }; });
    }

    function readRepositoryContext(query) {
        return fetch(bridgeRepositorySearchEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: query, limit: 8 }) })
            .then(function (response) { return response.ok ? response.json() : { results: [] }; })
            .catch(function () { return { results: [] }; });
    }

    conversation = conversation.filter(function (message) {
        return !/Failed to authenticate request with Clerk|No cookie auth credentials found|No local AI found/i.test(String(message.text || ""));
    });
    window.localStorage.setItem("aeStudioConversation", JSON.stringify(conversation.slice(-40)));
    if (conversation.length) {
        messages.innerHTML = "";
        conversation.slice(-40).forEach(function (message) { addMessage(message.text, message.role, false); });
    }

    function hostCall(command, payload, callback) {
        payload = payload || {};
        payload.requestId = "req-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
        var governance = window.AEPipe ? AEPipe.dryRun(command, payload, "panel") : null;
        if (governance && AEPipe.isMutation(command)) {
            var approved = window.confirm("AEPIPE PRIME\n\nAction: " + command + "\nState: DRY_RUN\n\nApply this reversible action to After Effects?");
            if (!approved) { governance.state = AEPipe.STATES.CANCELLED; AEPipe.append(governance); callback({ ok: false, status: "CANCELLED", message: "AEPIPE: user cancelled before lease." }); return; }
            AEPipe.approve(governance);
        }
        if (command === "runValidationHarness" && isCep) {
            payload.extensionPath = getCepExtensionPath();
        }
        if (!isCep) {
            window.setTimeout(function () { callback(mockCommand(command, payload)); }, 220);
            return;
        }
        var script = "aeStudioCommand(" + JSON.stringify(command) + "," + JSON.stringify(payload) + ")";
        new CSInterface().evalScript(script, function (result) {
            if (!result || result === "EvalScript error.") {
                callback({ ok: false, message: "After Effects rejected the host script. Restart After Effects and reopen AE Studio Chat." });
                return;
            }
            try {
                var parsed = JSON.parse(result);
                if (governance && window.AEPipe) {
                    AEPipe.recordResult(governance, parsed);
                    if (AEPipe.isMutation(command)) {
                        new CSInterface().evalScript("aeStudioCommand('summary',{})", function (summaryRaw) {
                            new CSInterface().evalScript("aeStudioCommand('healthReport',{})", function (healthRaw) {
                                var summary = null, health = null; try { summary = JSON.parse(summaryRaw); } catch (e1) {} try { health = JSON.parse(healthRaw); } catch (e2) {}
                                AEPipe.verify(governance, summary, health, parsed);
                                parsed.aepipe = { id: governance.id, state: governance.state, evidence: governance.evidence };
                                callback(parsed);
                            });
                        });
                        return;
                    }
                }
                callback(parsed && typeof parsed === "object" ? parsed : { ok: false, message: "Host returned an invalid response." });
            } catch (error) {
                callback({ ok: false, message: "After Effects returned an invalid host response: " + String(result).slice(0, 240) });
            }
        });
    }

    function getCepExtensionPath() {
        var extensionPath = "";
        try {
            if (window.__adobe_cep__ && typeof window.__adobe_cep__.getSystemPath === "function") extensionPath = decodeURI(window.__adobe_cep__.getSystemPath("extension") || "");
        } catch (cepError) { }
        if (!extensionPath) {
            try {
                var cepInterface = new CSInterface();
                if (typeof cepInterface.getSystemPath === "function") extensionPath = cepInterface.getSystemPath("extension") || "";
            } catch (interfaceError) { }
        }
        if (!extensionPath && window.location && window.location.pathname) {
            extensionPath = decodeURIComponent(window.location.pathname).replace(/[\\/]html[\\/]index\.html.*$/i, "");
            if (/^\/[A-Za-z]:[\\/]/.test(extensionPath)) extensionPath = extensionPath.slice(1);
        }
        return extensionPath.replace(/\\/g, "/").replace(/\/$/, "");
    }

    function mockCommand(command, payload) {
        if (command === "summary") return { project: "Untitled project", items: 0, activeItem: null, selectedLayers: [], compositions: [], message: "Mock mode: open this panel in After Effects for live project data." };
        if (command === "runValidationHarness") return { ok: true, report: { suitePassed: true, hostVersion: "mock", tests: [{ id: "MOCK", name: "Harness", status: "PASS" }], failedTests: [], metrics: {} } };
        if (command === "planWorkflow") return productionWorkflowPlan(payload);
        if (command === "restoreSnapshot") return { ok: true, message: "Mock opened snapshot: " + (payload.path || "selected snapshot") + "." };
        if (command === "createProject") return { ok: true, message: "Mock created " + (payload.name || "AE Studio Project") + " (" + payload.width + "x" + payload.height + ")." };
        if (command === "addTextLayer") return { ok: true, message: "Mock added text layer: " + (payload.text || "AE Studio") + "." };
        if (command === "addSolidLayer") return { ok: true, message: "Mock added solid layer: " + (payload.name || "AE Studio Solid") + "." };
        if (command === "addRectangleShape") return { ok: true, message: "Mock added rectangle shape." };
        if (command === "addEllipseShape") return { ok: true, message: "Mock added ellipse shape." };
        if (command === "addCamera") return { ok: true, message: "Mock added a 3D camera." };
        if (command === "addLight") return { ok: true, message: "Mock added a 3D light." };
        if (command === "addDropShadow") return { ok: true, message: "Mock added Drop Shadow to the selected layer." };
        if (command === "duplicateSelectedLayer") return { ok: true, message: "Mock duplicated the selected layer." };
        if (command === "addGaussianBlur") return { ok: true, message: "Mock added Gaussian Blur to the selected layer." };
        if (command === "setOpacityExpression") return { ok: true, message: "Mock applied an opacity expression." };
        if (command === "removeSelectedLayers") return { ok: true, message: "Mock removed selected layers." };
        if (command === "renderQueue") return { ok: true, message: "Mock completed the Render Queue." };
        if (command === "queueComposition") return { ok: true, message: "Mock added the active composition to the Render Queue." };
        if (command === "saveProject") return { ok: true, message: "Mock saved the project." };
        if (command === "importFootage") return { ok: true, message: "Mock imported " + (payload.path || "the selected asset") + "." };
        if (command === "updateSelectedLayer") return { ok: true, message: "Mock updated the selected layer." };
        if (command === "animateSelectedOpacity") return { ok: true, message: "Mock animated selected-layer opacity." };
        if (command === "transformSelectedLayer") return { ok: true, message: "Mock transformed the selected layer." };
        if (command === "updateComposition") return { ok: true, message: "Mock updated the active composition." };
        if (command === "openComposition") return { ok: true, message: "Mock opened composition: " + (payload.name || "selected composition") + "." };
        if (command === "openProject") return { ok: true, message: "Mock opened project: " + (payload.path || "selected project") + "." };
        if (command === "buildAntiTheftTeaser") return { ok: true, message: "Mock built the Anti-Theft Awareness Teaser." };
        if (command === "buildAudioTeaser") return { ok: true, message: "Mock built the audio teaser with generated voiceover." };
        return { ok: true, message: "Mock script completed." };
    }

    function learningGuide() {
        return "AE Studio workflow guide:\n1. Start with: Create a 1920x1080 composition named Intro, 10 seconds at 30 fps.\n2. Build visuals: Add a rectangle, circle, text, image, video, camera, or light.\n3. Select a layer, then say: rename it, set opacity to 70, rotate 20 degrees, duplicate it, add blur, or animate opacity.\n4. Use /expression wiggle(2, 20) for an Opacity expression, or /script for advanced ExtendScript.\n5. Say Save the project, add the composition to the render queue, then Render now.\n6. For a complete workflow, ask: Build a 5-step product intro project with a background, title, circle animation, and render setup.\nAvailable areas: Composition, layers, shapes, media import, effects, 3D camera/light, keyframes, expressions, project save/open, Render Queue, Google search, downloads, and image/audio/video AI generation. Use licensed media and confirm destructive or paid actions.";
    }

    function productionWorkflowPlan(payload) {
        var data = payload || {};
        var userGoal = data.goal || data.prompt || "Build a polished short-form AE production";
        return {
            ok: true,
            mode: "plan",
            goal: userGoal,
            phases: [
                "Inspect the active project and selected layers",
                "Reuse existing assets before creating new ones",
                "Create or update the target composition",
                "Add key visual layers (background, title, accent shapes)",
                "Apply motion, opacity, and effect polishing",
                "Save a project snapshot before major changes",
                "Review health and render readiness",
                "Add the composition to the Render Queue if requested"
            ],
            recommendedCommands: [
                { command: "summary", payload: {} },
                { command: "healthReport", payload: {} },
                { command: "createProject", payload: { name: "AE Studio Project", width: 1920, height: 1080, duration: 10, frameRate: 30 } },
                { command: "addSolidLayer", payload: { name: "Background", color: [0.08, 0.12, 0.14] } },
                { command: "addTextLayer", payload: { text: "Title", name: "Title" } },
                { command: "addEllipseShape", payload: { name: "Accent Circle", width: 280, height: 280, color: [1, 0.6, 0.3] } },
                { command: "transformSelectedLayer", payload: { position: [960, 540], scale: [100, 100], rotation: 0 } },
                { command: "animateSelectedOpacity", payload: { from: 0, to: 100, duration: 1 } },
                { command: "snapshotProject", payload: { label: "mvp-plan" } },
                { command: "queueComposition", payload: {} }
            ],
            message: "This plan keeps the work project-aware, reviewable, and reversible before executing any real AE mutation."
        };
    }

    function capabilityTestPlan() {
        return { commands: [
            { command: "createProject", payload: { name: "AE Studio Capability Test", width: 1920, height: 1080, duration: 8, frameRate: 30 } },
            { command: "addSolidLayer", payload: { name: "Background", color: [0.04, 0.07, 0.09] } },
            { command: "addTextLayer", payload: { name: "AE Studio Title", text: "AE STUDIO" } },
            { command: "addRectangleShape", payload: { name: "Info Panel", width: 900, height: 260, color: [0.12, 0.2, 0.24] } },
            { command: "addEllipseShape", payload: { name: "Accent Circle", width: 280, height: 280, color: [1, 0.55, 0.2] } },
            { command: "addDropShadow", payload: { opacity: 60, distance: 5 } },
            { command: "addGaussianBlur", payload: { amount: 8 } },
            { command: "animateSelectedOpacity", payload: { from: 0, to: 100, duration: 1 } },
            { command: "transformSelectedLayer", payload: { position: [960, 540], scale: [100, 100], rotation: 0 } },
            { command: "addCamera", payload: { name: "Capability Camera" } },
            { command: "addLight", payload: { name: "Capability Light" } },
            { command: "saveProject", payload: {} },
            { command: "snapshotProject", payload: { label: "capability-test" } },
            { command: "healthReport", payload: {} },
            { command: "queueComposition", payload: {} }
        ] };
    }

    function complexProductionTestPlan() {
        return { commands: [
            { command: "createProject", payload: { name: "Complex Test Scene", width: 1920, height: 1080, duration: 12, frameRate: 30 } },
            { command: "addSolidLayer", payload: { name: "Background", color: [0.04, 0.07, 0.09] } },
            { command: "addTextLayer", payload: { name: "Main Title", text: "CREATE BEYOND LIMITS" } },
            { command: "addTextLayer", payload: { name: "Subtitle", text: "AI-POWERED MOTION DESIGN" } },
            { command: "addRectangleShape", payload: { name: "Glass Panel", width: 900, height: 260, color: [0.12, 0.2, 0.24] } },
            { command: "addEllipseShape", payload: { name: "Accent Orb", width: 280, height: 280, color: [1, 0.55, 0.2] } },
            { command: "addDropShadow", payload: { opacity: 60, distance: 5 } },
            { command: "addGaussianBlur", payload: { amount: 8 } },
            { command: "animateSelectedOpacity", payload: { from: 0, to: 100, duration: 1.5 } },
            { command: "transformSelectedLayer", payload: { position: [960, 540], scale: [100, 100], rotation: 0 } },
            { command: "addCamera", payload: { name: "Main Camera" } },
            { command: "addLight", payload: { name: "Key Light" } },
            { command: "saveProject", payload: {} },
            { command: "snapshotProject", payload: { label: "complex-production-test" } },
            { command: "healthReport", payload: {} },
            { command: "queueComposition", payload: {} }
        ] };
    }

    function teaserProductionPlan() {
        return { commands: [
            { command: "createProject", payload: { name: "Product Launch Teaser", width: 1920, height: 1080, duration: 10, frameRate: 30 } },
            { command: "addSolidLayer", payload: { name: "Cinematic Background", color: [0.025, 0.04, 0.06] } },
            { command: "addRectangleShape", payload: { name: "Product Card", width: 900, height: 260, color: [0.12, 0.2, 0.24] } },
            { command: "addEllipseShape", payload: { name: "Glow Orb", width: 280, height: 280, color: [1, 0.55, 0.2] } },
            { command: "addTextLayer", payload: { name: "Brand Name", text: "NOVA" } },
            { command: "addTextLayer", payload: { name: "Product Title", text: "THE FUTURE IS HERE" } },
            { command: "addTextLayer", payload: { name: "Subtitle", text: "DESIGNED FOR WHAT COMES NEXT" } },
            { command: "addDropShadow", payload: { opacity: 60, distance: 5 } },
            { command: "addGaussianBlur", payload: { amount: 10 } },
            { command: "animateSelectedOpacity", payload: { from: 0, to: 100, duration: 1 } },
            { command: "transformSelectedLayer", payload: { position: [960, 540], scale: [100, 100], rotation: 0 } },
            { command: "addCamera", payload: { name: "Teaser Camera" } },
            { command: "addLight", payload: { name: "Teaser Key Light" } },
            { command: "saveProject", payload: {} },
            { command: "snapshotProject", payload: { label: "product-launch-teaser" } },
            { command: "queueComposition", payload: {} }
        ] };
    }

    function aeCapabilitiesGuide() {
        return "" +
            "AE Capability Encyclopedia:\n" +
            "- Project creation: createProject, openProject, saveProject, snapshotProject, restoreSnapshot.\n" +
            "- Composition management: openComposition, updateComposition, rename composition, duplicate, add/remove layers, work area, timing, duration, frame rate.\n" +
            "- Layer creation: addTextLayer for title, subtitle, captions, credits; addSolidLayer for background fills, logo plate, color blocks; addRectangleShape for UI blocks, bars, cards, panels; addEllipseShape for circles, badges, bokeh, soft shapes; addCamera and addLight for 3D depth; duplicateSelectedLayer for backup or parallel animation; removeSelectedLayers for cleanup.\n" +
            "- Layer editing: editLayer, updateSelectedLayer, selectLayer, inspectLayer, transformSelectedLayer, animateSelectedOpacity, setOpacityExpression.\n" +
            "- Transform operations: position, scale, rotation, anchor point, opacity, x/y movement, easing, parent/child relationships, 3D layering.\n" +
            "- Effects and style: Gaussian blur, drop shadow, glow, outlines, stroke, color grades, vignette, distortion, motion blur, shadows, soft focus, reflection.\n" +
            "- Text and typography: title cards, lower thirds, subtitles, logo text, kinetic typography, typographic animation, paragraph text, centered alignment.\n" +
            "- Asset workflow: importFootage, searchWeb, downloadAsset, generateImage, generateAudio, generateVideo.\n" +
            "- Project health and review: summary, healthReport.\n" +
            "- Rendering: queueComposition, renderQueue.\n" +
            "- Motion graphics and teaser workflows: buildAntiTheftTeaser, buildAudioTeaser.\n" +
            "- Scriptable automation: runScript for custom ExtendScript and advanced AE operations not covered by the basic command palette. For complex productions, return one complete self-contained script, not pseudocode or omitted scenes. Structure it with named helpers, deterministic names and timing, explicit target validation, safe MatchName fallbacks, guarded property access, deliberate eased motion, error handling, and a useful result. Inspect the supplied project inventory and adapt art direction to the user's brief instead of reusing a generic template.\n" +
            "- Safety: Before any destructive or expensive action, confirm with the user or ask for clarification if the target is ambiguous.\n" +
            "- Language mapping: words like circle, ellipse, round, badge, orb, dot, ring, bubble, ball, glow blob, soft circle map to addEllipseShape; rectangle, panel, card, bar, block, box, banner map to addRectangleShape; solid, background, fill, backdrop, bg map to addSolidLayer; title, text, caption, logo text, headline, subtitle map to addTextLayer; camera, 3D depth, perspective map to addCamera; light, rim light, key light, fill light map to addLight; blur, soften, defocus map to addGaussianBlur; shadow, drop shadow, soft shadow map to addDropShadow; move, position, translate, shift, animate motion map to transformSelectedLayer; rotate, spin, turn, angle map to transformSelectedLayer with rotation; opacity, fade, dissolve, transparency map to updateSelectedLayer or animateSelectedOpacity; render, export, queue, output map to queueComposition or renderQueue.\n" +
            "- Use the current project inventory and selected layers as the authoritative source; do not claim a layer, composition, or asset exists unless it is visible in the context. Reuse existing assets before creating new ones.\n" +
            "- For a user request that describes an AE composition or motion graphic task, return a JSON command list with dependency order and no markdown. If the user asks for general explanation or small talk, respond in plain conversational form without a command object.\n";
    }

    function aeTitanCorePrompt() {
        return "AE-Titan Core contract: You are a senior motion-graphics architect, broadcast technical director, ExtendScript engineer, and After Effects agent operating through this CEP panel. Think through project hierarchy, memory-sensitive composition structure, keyframe easing, render constraints, and the supplied project inventory before acting, but never reveal private chain-of-thought; provide only a concise plan summary and executable result. Answer explanations in precise Persian when the user speaks Persian, while all JSX identifiers and code remain in English. " +
            "ExtendScript rules: use only ES3/ES5 syntax (var, classic functions, string concatenation, standard for loops); never let/const, arrow functions, template literals, destructuring, classes, or other ES6 syntax. Production scripts must be isolated with an undo group, try/catch/finally, verify app.project and active CompItem before use, validate layers/effects/properties, and return a useful error. Prefer stable Transform properties, solids, shape layers, and optimized expressions over fragile text animators. Use effect fallbacks because MatchNames vary across After Effects versions. Preserve Persian RTL, ZWNJ, Unicode, and escaped strings safely. Use KeyframeEase with cinematic influence around 65-75%; avoid dry linear motion. For 3D layers set threeDLayer before applying [x,y,z]. " +
            "Agent loop: inspect intent and current project; architect folders such as 01. Assets/Holders, 02. PreComps/Scenes, and 03. Master Comp; generate complete code without ellipses or omitted scenes; verify syntax, brackets, variables, MatchNames, and likely After Effects errors; if execution fails, diagnose the root cause and produce one corrected validated runScript retry. For complex work exceeding 16 primitive operations, prefer one complete self-contained runScript. " +
            "Modes: Ask is read-only advice and inspection; Agent plans and executes confirmed changes; Script produces complete isolated JSX with minimal prose. Broadcast visual standard: cinematic navy/black backgrounds, cyan or turquoise highlights, broadcast gold, restrained vignette, 2.5D parallax, and 25-35 percent negative space for Persian typography and HUD readability. Never claim success until the panel has executed the command and verified the resulting project summary and health report.";
    }

    function conversationalSystemPrompt(contextText, mode) {
        var modeInstruction = mode === "ask" ? "The user selected Ask mode: explain, inspect, or plan in plain language, and never return executable mutation commands." : mode === "script" ? "The user selected Script mode: for complex requests prefer one complete ES3/ES5 runScript command, explain only the short purpose, and wait for execution confirmation." : "The user selected Agent mode: inspect, plan, build, verify, and repair through executable commands with confirmation for mutations.";
        return "You are AE Studio AI, a friendly conversational assistant embedded in Adobe After Effects. " +
            "Chat naturally like a helpful human assistant and understand Persian and English. " +
            "Use the conversation history and the current After Effects context to answer follow-up questions. " +
            "For greetings, questions, explanations, brainstorming, and casual conversation, return plain natural-language text or JSON {reply:\"...\"}; never invent an After Effects command. " +
            "Only return a command object or {commands:[...]} when the user explicitly asks you to perform an After Effects action such as creating, editing, importing, saving, animating, or rendering. " +
            "For an action, use at most 16 executable commands in dependency order and return JSON without markdown. " +
            "Act as an execution agent: inspect the supplied project context, make a concise plan, choose the safest construction path, execute the requested build, and rely on the panel's final summary and health verification. Do not claim success before a command has been returned and executed. Do not expose private chain-of-thought; provide only a short plan summary when useful. " +
            modeInstruction + " " +
            aeTitanCorePrompt() + " " +
            "Select visual style, palette, typography, and motion for this brief and current project; do not apply a fixed house palette unless requested. " +
            "Allowed commands: summary, healthReport, snapshotProject, restoreSnapshot, openProject, createProject, updateComposition, openComposition, selectLayer, inspectLayer, editLayer, addTextLayer, addSolidLayer, addRectangleShape, addEllipseShape, addCamera, addLight, addDropShadow, addGaussianBlur, setOpacityExpression, duplicateSelectedLayer, removeSelectedLayers, queueComposition, renderQueue, saveProject, importFootage, searchWeb, downloadAsset, generateImage, generateAudio, generateVideo, buildAntiTheftTeaser, buildAudioTeaser, updateSelectedLayer, animateSelectedOpacity, transformSelectedLayer, runScript, planWorkflow. " +
            "For a complex build request or a request to write a professional After Effects script, prefer {command:\"runScript\",payload:{source:\"...\"}}. The source may be a long complete ES3/ES5 ExtendScript like a modular broadcast engine, but it must stay within 200000 characters and be executable as-is in After Effects. Never return {reply:\"Completed\"} unless an executable command has actually been returned. " +
            "For audio teaser, voiceover teaser, podcast teaser, or تیزر صوتی requests, use buildAudioTeaser with prompt, title, subtitle, duration, and format. " +
            "Ask a concise clarifying question when a required file path or destructive action is ambiguous. " +
            aeCapabilitiesGuide() +
            "Current After Effects context: " + contextText +
            " Treat compositions, layerItems, projectItems, selectedLayers, text, source, file, timing, and dimensions as the authoritative current project inventory. Before generating content, reuse existing assets and layers when appropriate; do not claim an asset exists unless it is listed in this inventory. If the user asks to create content from existing project material, inspect this inventory and build commands that reference the available composition or selected layer.";
    }

    function requiresGenerativeScript(text) {
        return /(?:\b(?:write|generate|author|create)\b[\s\S]{0,80}\b(?:script|jsx|extendscript)\b|\b(?:script|jsx|extendscript)\b[\s\S]{0,80}\b(?:write|generate|author)\b|اسکریپت[\s\S]{0,100}(?:بنویس|تولید|حرفه|بساز)|(?:بنویس|تولید)[\s\S]{0,100}(?:اسکریپت|jsx))/i.test(String(text || ""));
    }

    function askProvider(text, callback) {
        if (offlineFirst || provider.type === "offline") {
            if (requiresGenerativeScript(text)) {
                callback({ error: uiText("Offline Core uses fixed rules and cannot author production ExtendScript. In Settings, choose VS Code Copilot or another AI provider, switch Offline Core off, and save the connection. Project context is sent only through the provider you choose.", "هسته آفلاین فقط چند قاعده ثابت دارد و نمی‌تواند ExtendScript حرفه‌ای تولید کند. در تنظیمات، VS Code Copilot یا یک سرویس‌دهنده هوش مصنوعی دیگر را انتخاب کنید، Offline Core را خاموش کنید و اتصال را ذخیره کنید. زمینه پروژه فقط از طریق سرویس‌دهنده‌ای که انتخاب می‌کنید ارسال می‌شود.") });
                return;
            }
            if (window.AEBossProductionSpec && hasBuildIntent(text)) {
                var productionSpec = AEBossProductionSpec.create(text, offlineContextState);
                var productionPlan = AEBossProductionSpec.compile(productionSpec);
                callback({ commands: productionPlan.steps.map(function (step) { return { command: step.action, payload: step.input || {} }; }), offline: true, productionSpec: productionSpec, planFingerprint: productionPlan.fingerprint }, { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, estimated: true, provider: "offline-production-core" });
                return;
            }
            if (window.AEBossOfflineCore) {
                var offlineIntent = AEBossOfflineCore.resolveIntent(text, offlineContextState);
                if (offlineIntent.intent !== "unsupported") {
                    if (offlineIntent.state !== "RESOLVED") { callback({ reply: uiText("Please clarify what you want to build before I make changes.", "لطفاً پیش از ایجاد تغییر، دقیق‌تر بگویید چه چیزی باید ساخته شود.") }, { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, estimated: true, provider: "offline-core" }); return; }
                    var compiled = AEBossOfflineCore.compilePlan(offlineIntent, offlineIntent.context);
                    if (!compiled.ok || !AEBossOfflineCore.validateGraph(compiled.plan).ok) { callback({ error: "OFFLINE_PLAN_VALIDATION_FAILED" }); return; }
                    var offlineCommands = compiled.plan.steps.filter(function (step) { return step.action !== "summary" || step.id === "verify"; }).map(function (step) { return { command: step.action, payload: step.input || {} }; });
                    callback({ commands: offlineCommands, offline: true, planFingerprint: compiled.fingerprint }, { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, estimated: true, provider: "offline-core" });
                    return;
                }
                if (hasExplicitActionIntent(text)) { callback({ reply: uiText("I could not resolve that offline command safely. Please specify composition, text, animation, or render.", "این فرمان را به‌صورت آفلاین و ایمن تشخیص ندادم. لطفاً کامپوزیشن، متن، انیمیشن یا رندر را مشخص کنید.") }, { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, estimated: true, provider: "offline-core" }); return; }
            }
            if (!window.AEBossOffline || !window.AEBossOffline.infer) { callback({ error: "Offline Core unavailable. Run setup-offline-python.ps1 and reopen the panel." }); return; }
            window.AEBossOffline.infer(text, language, function (result) {
                if (!result || result.ok === false) { callback({ error: (result && result.error) || "Offline inference failed." }); return; }
                if (result.commands && result.commands.length && chatMode !== "ask") { callback({ commands: result.commands, offline: true }, { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, estimated: true, provider: "offline-core" }); return; }
                callback({ reply: result.reply || "Offline Core is ready.", offline: true }, { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, estimated: true, provider: "offline-core" });
            });
            return;
        }
        if (!provider.endpoint) { callback({ error: "No endpoint configured for " + (provider.type || "selected provider") + "." }); return; }
        var headers = { "Content-Type": "application/json" };
        if (!isLocalProvider(provider.type) && provider.apiKey) headers.Authorization = "Bearer " + provider.apiKey;
        hostCall("summary", {}, function (context) {
            Promise.all([readSharedMemory(), readRepositoryContext(text)]).then(function (contextSources) {
            var memory = contextSources[0];
            var repository = contextSources[1];
            var memoryText = (memory.entries || []).slice(-12).map(function (entry) { return entry.role + ": " + entry.text; }).join("\n");
            var repositoryText = JSON.stringify(repository || { results: [] });
            var contextText = JSON.stringify(context || {}) + "\nRepository search context for this request:\n" + repositoryText + "\nShared memory from all providers:\n" + (memoryText || "(empty)");
            var recentMessages = conversation.slice(-7, -1).map(function (message) { return { role: message.role === "user" ? "user" : "assistant", content: message.text }; });
            recentMessages.push({ role: "user", content: text });
            var requestBody = { provider: provider.type || "auto", model: provider.model || "auto", temperature: Number(provider.temperature) || 0.1, messages: [
                { role: "system", content: "You are HADI, the conversational After Effects production teacher and automation agent. Understand Persian and English. Return JSON only. For normal conversation, answer with {reply:\"brief natural-language answer\"}; do not invent a command for questions, greetings, explanations, or planning discussions. When the user asks to build, create, make, generate, set up, or produce a project (including Persian words such as بساز، بسازم، ساختن، ایجاد کن، درست کن، طراحی کن، تولید کن), return one command object or {commands:[...]} with at most 16 executable commands. Use multiple commands for complete workflows and preserve dependency order: create/open project, create/update composition, create assets/layers, apply animation/effects, save, queue render. If the request is underspecified, choose sensible After Effects defaults and still build a useful first version. For anti-theft, theft-prevention, security-awareness, or robbery-prevention teaser requests, use buildAntiTheftTeaser with {}. Each command has keys command and payload. Allowed commands: summary with {}, openProject with path, createProject with name,width,height,duration,frameRate, updateComposition with width,height,duration,frameRate, openComposition with name, addTextLayer with text,name, addSolidLayer with name,color,width,height, addRectangleShape with name,width,height,color, addEllipseShape with name,width,height,color, addCamera with name, addLight with name, addDropShadow with opacity,distance, addGaussianBlur with amount, setOpacityExpression with source, duplicateSelectedLayer with {}, removeSelectedLayers with {}, queueComposition with optional outputPath, renderQueue with {}, saveProject with optional path, importFootage with path,name, searchWeb with query, downloadAsset with url,fileName, generateImage with prompt,size,fileName, generateAudio with prompt,format,fileName, generateVideo with prompt,duration,format,fileName, buildAntiTheftTeaser with {}, updateSelectedLayer with name,opacity, animateSelectedOpacity with from,to,duration, transformSelectedLayer with position,scale,rotation, or runScript with source. Never include markdown inside JSON. Current After Effects context: " + contextText },
            ].concat(recentMessages) };
            requestBody.messages[0].content = conversationalSystemPrompt(contextText, chatMode) +
                " You have direct access to the currently open After Effects project through the AE Studio host bridge. " +
                "For an explicit build or edit request, return executable command JSON so the panel can run it in that project immediately. " +
                "Do not ask the user to copy code, open another tool, or authenticate a local model. The panel supplies the project context and executes only the allowed commands. Use the supplied project inventory to decide whether to update an existing composition/layer or create a new one.";
            if (provider.type === "anthropic") {
                headers = { "Content-Type": "application/json", "x-api-key": provider.apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" };
                requestBody = { model: provider.model, max_tokens: Number(provider.tokenBudget) || 2048, temperature: Number(provider.temperature) || 0.1, system: requestBody.messages[0].content, messages: requestBody.messages.slice(1) };
            } else if (provider.type === "google") {
                headers = { "Content-Type": "application/json" };
                requestBody = { contents: requestBody.messages.slice(1).map(function (message) { return { role: message.role === "assistant" ? "model" : "user", parts: [{ text: message.content }] }; }), generationConfig: { temperature: Number(provider.temperature) || 0.1, maxOutputTokens: Number(provider.tokenBudget) || 2048 }, systemInstruction: { parts: [{ text: requestBody.messages[0].content }] } };
            }
            if (provider.type === "openrouter") {
                headers["HTTP-Referer"] = window.location.href;
                headers["X-Title"] = "AE Studio";
                if (provider.tokenBudget) requestBody.max_tokens = Number(provider.tokenBudget);
            }
            var requestEndpoint = localProviderTypes.indexOf(provider.type || "auto") >= 0 ? bridgeChatEndpoint : provider.endpoint;
            if (provider.type === "google") {
                var googleModel = String(provider.model || "").replace(/^models\//, "");
                if (googleModel) {
                    requestEndpoint = requestEndpoint.replace(/\/models\/[^/]+:generateContent\/?$/, "/models/" + googleModel + ":generateContent");
                    if (!/\/models\/[^/]+:generateContent\/?$/.test(requestEndpoint)) requestEndpoint = requestEndpoint.replace(/\/?$/, "/models/" + googleModel + ":generateContent");
                }
                requestEndpoint += (requestEndpoint.indexOf("?") >= 0 ? "&" : "?") + "key=" + encodeURIComponent(provider.apiKey);
            }
            fetch(requestEndpoint, { method: "POST", headers: headers, body: JSON.stringify(requestBody) }).then(function (response) {
                return response.text().then(function (raw) {
                    var data;
                    try { data = JSON.parse(raw || "{}"); } catch (_) { data = {}; }
                    if (!response.ok) {
                        var providerError = data.error && (data.error.message || data.error);
                        throw new Error(String(providerError || "Provider HTTP " + response.status));
                    }
                    return data;
                });
            }).then(function (data) {
            var content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
            if (provider.type === "anthropic") content = data.content && data.content[0] && data.content[0].text;
            if (provider.type === "google") content = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
            if (!content) throw new Error("Provider returned no message.");
            var cleanContent = String(content).trim().replace(/^```(?:json)?\s*|\s*```$/gi, "").trim();
            var request;
            try {
                request = JSON.parse(cleanContent);
            } catch (parseError) {
                // Recover JSON when a model wraps it in a short explanation or markdown.
                var jsonStart = cleanContent.indexOf("{");
                var jsonEnd = cleanContent.lastIndexOf("}");
                if (jsonStart >= 0 && jsonEnd > jsonStart) {
                    var embeddedJson = cleanContent.slice(jsonStart, jsonEnd + 1);
                    try {
                        request = JSON.parse(embeddedJson);
                    } catch (_) {
                        // Recover the JavaScript-like object notation common in local model responses.
                        try {
                            request = JSON.parse(embeddedJson
                                .replace(/([{,]\s*)([A-Za-z_$][\w$-]*)\s*:/g, '$1"$2":')
                                .replace(/:\s*'([^']*)'/g, ': "$1"'));
                        } catch (__) { request = null; }
                    }
                }
                if (!request) {
                    if (hasExplicitActionIntent(text) && /(?:app\.project|app\.beginUndoGroup|app\.endUndoGroup|function\s*\()/i.test(cleanContent)) {
                        callback({ commands: [{ command: "runScript", payload: { source: cleanContent } }] }, data.usage || estimateUsage(recentMessages));
                        return;
                    }
                    // Some compatible local models answer naturally despite the JSON instruction.
                    callback({ reply: cleanContent }, data.usage || estimateUsage(recentMessages));
                    return;
                }
            }
            if (typeof request.reply === "string" && request.reply.trim() && !request.command && !request.commands && !hasExplicitActionIntent(text)) { callback({ reply: request.reply.trim() }, data.usage || estimateUsage(recentMessages)); return; }
            if (request && typeof request.message === "string" && request.message.trim() && !request.command && !request.commands) {
                callback({ reply: request.message.trim() }, data.usage || estimateUsage(recentMessages));
                return;
            }
            if (request && typeof request.status === "string" && !request.command && !request.commands && !hasExplicitActionIntent(text)) {
                callback({ reply: request.status.trim() }, data.usage || estimateUsage(recentMessages));
                return;
            }
            // Do not execute a model-generated command when the user's message is
            // conversational. Local models occasionally ignore the JSON contract
            // and emit a stale command from the surrounding conversation.
            if (!hasExplicitActionIntent(text)) {
                callback({ reply: conversationalFallbackReply(text) }, data.usage || estimateUsage(recentMessages));
                return;
            }
            var plan = request.commands || request.steps || request.operations || request.actions || request.tasks || request.plan || [request];
            if (plan && !Array.isArray(plan) && typeof plan === "object") plan = plan.commands || plan.steps || plan.operations || plan.actions || plan.tasks || [plan];
            if (Array.isArray(request)) plan = request;
            if (!Array.isArray(plan) || plan.length < 1 || plan.length > 16) throw new Error("Provider returned an invalid plan: expected 1 to 16 commands.");
            plan = plan.map(normalizeCommand);
            plan.forEach(function (command) {
                if (!command || ["summary", "healthReport", "runValidationHarness", "snapshotProject", "restoreSnapshot", "openProject", "createProject", "updateComposition", "openComposition", "selectLayer", "inspectLayer", "editLayer", "addTextLayer", "addSolidLayer", "addRectangleShape", "addEllipseShape", "addCamera", "addLight", "addDropShadow", "addGaussianBlur", "setOpacityExpression", "duplicateSelectedLayer", "removeSelectedLayers", "queueComposition", "renderQueue", "saveProject", "importFootage", "searchWeb", "downloadAsset", "generateImage", "generateAudio", "generateVideo", "buildAntiTheftTeaser", "buildAudioTeaser", "updateSelectedLayer", "animateSelectedOpacity", "transformSelectedLayer", "runScript"].indexOf(command.command) < 0 || !validateRequest(command)) throw new Error("Provider returned invalid command: " + (command && command.command || "unknown") + ". Received: " + JSON.stringify(command).slice(0, 400));
            });
            callback({ commands: plan }, data.usage || estimateUsage(recentMessages));
            }).catch(function (error) { callback({ error: error.message }); });
            });
        });
    }

    function normalizeCommand(command) {
        if (!command || typeof command !== "object") return command;
        if (command.command && typeof command.command === "object") {
            var nestedCommand = command.command;
            command = Object.assign({}, nestedCommand, command.payload ? { payload: command.payload } : command.arguments ? { payload: command.arguments } : {});
        }
        if (!command.command && typeof command.script === "string") { command.command = "runScript"; command.payload = { source: command.script }; }
        if (!command.command && typeof command.extendScript === "string") { command.command = "runScript"; command.payload = { source: command.extendScript }; }
        if (!command.command && typeof command.code === "string") { command.command = "runScript"; command.payload = { source: command.code }; }
        if (!command.command && command.command_name) command.command = command.command_name;
        if (!command.command && command.action) command.command = command.action;
        if (!command.command && command.type) command.command = command.type;
        if (!command.command && command.operation) command.command = command.operation;
        if (!command.command && command.tool) command.command = command.tool;
        if (!command.command && command.function) command.command = command.function;
        if (!command.command && command.operationName) command.command = command.operationName;
        if (!command.command && command.name && /^(summary|healthReport|snapshotProject|restoreSnapshot|openProject|createProject|createComposition|updateComposition|openComposition|selectLayer|inspectLayer|editLayer|addTextLayer|addText|addSolidLayer|addRectangleShape|addShape|addEllipseShape|addCamera|addLight|addDropShadow|addGaussianBlur|setOpacityExpression|duplicateSelectedLayer|removeSelectedLayers|queueComposition|renderQueue|saveProject|save|importFootage|searchWeb|downloadAsset|generateImage|generateAudio|generateVideo|buildAntiTheftTeaser|buildAudioTeaser|updateSelectedLayer|animateSelectedOpacity|transformSelectedLayer|runScript|script|extendScript|planWorkflow)$/i.test(String(command.name))) command.command = command.name;
        if (typeof command.command === "string") {
            command.command = command.command.replace(/[\s_-]+/g, "");
            var canonicalCommands = { summary: "summary", healthreport: "healthReport", runvalidationharness: "runValidationHarness", snapshotproject: "snapshotProject", restoresnapshot: "restoreSnapshot", openproject: "openProject", createproject: "createProject", createcomposition: "createProject", updatecomposition: "updateComposition", opencomposition: "openComposition", selectlayer: "selectLayer", inspectlayer: "inspectLayer", editlayer: "editLayer", addtextlayer: "addTextLayer", addtext: "addTextLayer", addsolidlayer: "addSolidLayer", addrectangleshape: "addRectangleShape", addshape: "addRectangleShape", addellipseshape: "addEllipseShape", addcamera: "addCamera", addlight: "addLight", adddropshadow: "addDropShadow", addgaussianblur: "addGaussianBlur", setopacityexpression: "setOpacityExpression", duplicateselectedlayer: "duplicateSelectedLayer", removeselectedlayers: "removeSelectedLayers", queuecomposition: "queueComposition", renderqueue: "renderQueue", saveproject: "saveProject", save: "saveProject", importfootage: "importFootage", searchweb: "searchWeb", downloadasset: "downloadAsset", generateimage: "generateImage", generateaudio: "generateAudio", generatevideo: "generateVideo", buildantitheftteaser: "buildAntiTheftTeaser", buildaudioteaser: "buildAudioTeaser", updateselectedlayer: "updateSelectedLayer", animateselectedopacity: "animateSelectedOpacity", transformselectedlayer: "transformSelectedLayer", runscript: "runScript", script: "runScript", extendscript: "runScript", planworkflow: "planWorkflow" };
            command.command = canonicalCommands[String(command.command).toLowerCase()] || command.command;
        }
        if (command.command === "createComposition") command.command = "createProject";
        if (command.command === "addText") command.command = "addTextLayer";
        if (command.command === "addShape") command.command = "addRectangleShape";
        if (command.command === "addBackground") command.command = "addSolidLayer";
        if (command.command === "save") command.command = "saveProject";
        if (command.command === "render") command.command = "renderQueue";
        if (typeof command.command === "string" && ["script", "extendscript"].indexOf(command.command.toLowerCase()) >= 0) command.command = "runScript";
        if (!command.payload && command.composition && typeof command.composition === "object") command.payload = command.composition;
        if (!command.payload && command.parameters && typeof command.parameters === "object") command.payload = command.parameters;
        if (!command.payload && command.args && typeof command.args === "object") command.payload = command.args;
        if (!command.payload && command.arguments && typeof command.arguments === "object") command.payload = command.arguments;
        if (command.payload && typeof command.payload === "object") return command;
        var payload = {};
        Object.keys(command).forEach(function (key) {
            if (key !== "command" && key !== "commands") payload[key] = command[key];
        });
        if (payload.fps !== undefined && payload.frameRate === undefined) payload.frameRate = payload.fps;
        if (command.command === "createProject") {
            payload.name = payload.name || payload.project || "AE Studio Project";
            payload.width = Number(payload.width) || 1920;
            payload.height = Number(payload.height) || 1080;
            payload.duration = Number(payload.duration) || 10;
            payload.frameRate = Number(payload.frameRate) || 30;
            delete payload.project;
            delete payload.fps;
        }
        return { command: command.command, payload: payload };
    }

    function estimateUsage(requestMessages) {
        var characters = requestMessages.reduce(function (total, message) { return total + String(message.content || "").length; }, 0);
        return { total_tokens: Math.ceil(characters / 4), estimated: true };
    }

    function recordUsage(usage) {
        if (!usage) return;
        var total = Number(usage.total_tokens || usage.totalTokens || 0);
        if (!isFinite(total)) return;
        tokenTotals.prompt += Number(usage.prompt_tokens || usage.promptTokens || 0);
        tokenTotals.completion += Number(usage.completion_tokens || usage.completionTokens || 0);
        tokenTotals.total += total;
        tokenTotals.estimated = tokenTotals.estimated || Boolean(usage.estimated);
        window.localStorage.setItem("aeStudioTokenTotals", JSON.stringify(tokenTotals));
        tokenUsage.textContent = (tokenTotals.estimated ? "~" : "") + tokenTotals.total + " tok";
        tokenUsage.title = (tokenTotals.estimated ? "Estimated" : "Reported") + " session usage: " + tokenTotals.prompt + " prompt, " + tokenTotals.completion + " completion tokens";
        tokenUsage.style.color = provider.tokenBudget && tokenTotals.total >= provider.tokenBudget ? "#ff8f7a" : "";
    }

    if (tokenTotals.total > 0) {
        tokenUsage.textContent = (tokenTotals.estimated ? "~" : "") + tokenTotals.total + " tok";
        tokenUsage.title = (tokenTotals.estimated ? "Estimated" : "Reported") + " session usage: " + tokenTotals.prompt + " prompt, " + tokenTotals.completion + " completion tokens";
        tokenUsage.style.color = provider.tokenBudget && tokenTotals.total >= provider.tokenBudget ? "#ff8f7a" : "";
    }

    function safeProviderPath(value) {
        if (typeof value !== "string" || value.length < 1 || value.length > 4096) return false;
        if(/[\u0000-\u001f]/.test(value)) return false;
        return !/(^|[\\/])\.\.([\\/]|$)/.test(value);
    }

    function safeScriptSource(source) {
        if (typeof source !== "string" || source.length < 1 || source.length > 200000) return false;
        return !/(?:system\.callSystem|new\s+Socket|BridgeTalk|XMLHttpRequest|\$\.evalFile|\bapp\.open\s*\(|\beval\s*\()/i.test(source);
    }

    function validateRequest(request) {
        var payload = request && request.payload || {};
        if (!request || !request.command) return false;
        if (["runScript", "setOpacityExpression"].indexOf(request.command) >= 0) return safeScriptSource(payload.source);
        if (request.command === "planWorkflow") return typeof payload.goal === "string" || payload.goal === undefined;
        if (request.command === "createProject") return validNumber(payload.width, 16, 16384) && validNumber(payload.height, 16, 16384) && validNumber(payload.duration, 0.1, 86400) && validNumber(payload.frameRate, 1, 240);
        if (request.command === "updateComposition") return (!payload.width || validNumber(payload.width, 16, 16384)) && (!payload.height || validNumber(payload.height, 16, 16384)) && (!payload.duration || validNumber(payload.duration, 0.1, 86400)) && (!payload.frameRate || validNumber(payload.frameRate, 1, 240));
        if (["openProject", "importFootage"].indexOf(request.command) >= 0) return safeProviderPath(payload.path);
        if (request.command === "restoreSnapshot") return safeProviderPath(payload.path) && /\.aep$/i.test(payload.path);
        if (["openComposition", "addTextLayer", "updateSelectedLayer"].indexOf(request.command) >= 0) return !payload.name || String(payload.name).length <= 512;
        if (request.command === "animateSelectedOpacity") return validNumber(payload.from, 0, 100) && validNumber(payload.to, 0, 100) && validNumber(payload.duration, 0.01, 86400);
        if (request.command === "addGaussianBlur") return !payload.amount || validNumber(payload.amount, 0, 10000);
        if (request.command === "addDropShadow") return (!payload.opacity || validNumber(payload.opacity, 0, 100)) && (!payload.distance || validNumber(payload.distance, 0, 10000));
        if (["generateImage", "generateAudio", "generateVideo"].indexOf(request.command) >= 0) return typeof payload.prompt === "string" && payload.prompt.length > 0 && payload.prompt.length <= 4000;
        if (request.command === "searchWeb") return typeof payload.query === "string" && payload.query.length > 0 && payload.query.length <= 512;
        if (request.command === "downloadAsset") return typeof payload.url === "string" && /^https?:\/\//i.test(payload.url) && payload.url.length <= 4096;
        if (request.command === "buildAntiTheftTeaser") return true;
        if (request.command === "buildAudioTeaser") return typeof payload.prompt === "string" && payload.prompt.length > 0 && payload.prompt.length <= 4000 && (!payload.duration || validNumber(payload.duration, 0.1, 86400));
        return true;
    }

    function validNumber(value, minimum, maximum) {
        var number = Number(value);
        return value !== undefined && isFinite(number) && number >= minimum && number <= maximum;
    }

    function parseRequest(text) {
        var lower = text.toLowerCase();
        if (text.length > 120 && /(?:app\.beginUndoGroup|app\.project|app\.endUndoGroup|function\s*\()/i.test(text)) {
            var pastedScript = text.replace(/^```(?:javascript|jsx|extendscript)?\s*/i, "").replace(/\s*```$/i, "").trim();
            return { command: "runScript", payload: { source: pastedScript } };
        }
        if (lower.indexOf("complex production") >= 0 || lower.indexOf("complex test scene") >= 0 || lower.indexOf("motion graphics") >= 0 || lower.indexOf("موشن گرافیک") >= 0) return complexProductionTestPlan();
        if (lower.indexOf("capability test") >= 0 || lower.indexOf("تست توانایی") >= 0 || lower.indexOf("تست کامل قابلیت") >= 0) return capabilityTestPlan();
        if ((lower.indexOf("audio teaser") >= 0 || lower.indexOf("voiceover teaser") >= 0 || lower.indexOf("تیزر صوتی") >= 0 || lower.indexOf("تیزر با صوت") >= 0) && (hasExplicitActionIntent(text) || lower.indexOf("teaser") >= 0 || lower.indexOf("تیزر") >= 0)) {
            return { command: "buildAudioTeaser", payload: { name: "Audio Teaser", title: "AUDIO TEASER", subtitle: "Sound tells the story", prompt: text, duration: 15, format: "mp3" } };
        }
        if (lower.indexOf("teaser") >= 0 || lower.indexOf("تیزر") >= 0) return teaserProductionPlan();
        if (lower.indexOf("/script ") === 0 || lower.indexOf("run script:") === 0) {
            var source = text.replace(/^\/script\s*/i, "").replace(/^run script:\s*/i, "");
            return { command: "runScript", payload: { source: source } };
        }
        if (lower.indexOf("/expression ") === 0) return { command: "setOpacityExpression", payload: { source: text.replace(/^\/expression\s*/i, "") } };
        if (lower.indexOf("edit layer") >= 0 || lower.indexOf("ویرایش لایه") >= 0 || lower.indexOf("تغییر لایه") >= 0) return { command: "editLayer", payload: {} };
        if (lower.indexOf("inspect layer") >= 0 || lower.indexOf("layer details") >= 0 || lower.indexOf("جزئیات لایه") >= 0 || lower.indexOf("بررسی لایه") >= 0) return { command: "inspectLayer", payload: {} };
        if (lower.indexOf("restore snapshot") >= 0 || lower.indexOf("open snapshot") >= 0 || lower.indexOf("بازیابی نسخه") >= 0 || lower.indexOf("بازگردانی snapshot") >= 0) {
            var snapshotPath = text.match(/(?:restore snapshot|open snapshot|بازیابی نسخه|بازگردانی snapshot)\s+["“”']?([^"“”']+\.aep)["“”']?/i);
            return { command: "restoreSnapshot", payload: { path: snapshotPath ? snapshotPath[1].trim() : "" } };
        }
        if (lower.indexOf("snapshot") >= 0 || lower.indexOf("version") >= 0 || lower.indexOf("نسخه پشتیبان") >= 0 || lower.indexOf("اسنپ‌شات") >= 0) return { command: "snapshotProject", payload: { label: "manual" } };
        if (lower.indexOf("runtime validation") >= 0 || lower.indexOf("validation harness") >= 0 || lower.indexOf("ae harness") >= 0 || lower.indexOf("اعتبارسنجی ae") >= 0 || lower.indexOf("تست رانتایم") >= 0 || lower.indexOf("تست رانتایم") >= 0 || lower.indexOf("تست افترافکت") >= 0) return { command: "runValidationHarness", payload: {} };
        if (lower.indexOf("health") >= 0 || lower.indexOf("سلامت پروژه") >= 0 || lower.indexOf("بررسی سلامت") >= 0) return { command: "healthReport", payload: {} };
        if (lower.indexOf("plan") >= 0 || lower.indexOf("roadmap") >= 0 || lower.indexOf("workflow") >= 0 || lower.indexOf("برنامه") >= 0 || lower.indexOf("برنامه‌ریزی") >= 0) return { command: "planWorkflow", payload: { goal: text } };
        if (lower.indexOf("inspect") >= 0 || lower.indexOf("project") >= 0 && lower.indexOf("create") < 0) return { command: "summary", payload: {} };
        if (lower.indexOf("text") >= 0 || lower.indexOf("headline") >= 0 || lower.indexOf("title") >= 0 || lower.indexOf("subtitle") >= 0 || lower.indexOf("caption") >= 0 || lower.indexOf("logo") >= 0 || lower.indexOf("متن") >= 0 || lower.indexOf("تیتر") >= 0 || lower.indexOf("زیرنویس") >= 0 || lower.indexOf("لوگو") >= 0) {
            var quoted = text.match(/["“”']([^"“”']+)["“”']/);
            return { command: "addTextLayer", payload: { text: quoted ? quoted[1] : "AE Studio" } };
        }
        if (lower.indexOf("solid") >= 0 || lower.indexOf("background") >= 0 || lower.indexOf("backdrop") >= 0 || lower.indexOf("fill") >= 0 || lower.indexOf("bg") >= 0 || lower.indexOf("پس زمینه") >= 0 || lower.indexOf("پس‌زمینه") >= 0 || lower.indexOf("پشت زمینه") >= 0 || lower.indexOf("رنگ زمینه") >= 0) return { command: "addSolidLayer", payload: { name: "AE Studio Background", color: [0.08, 0.12, 0.14] } };
        if (lower.indexOf("rectangle") >= 0 || lower.indexOf("panel") >= 0 || lower.indexOf("card") >= 0 || lower.indexOf("bar") >= 0 || lower.indexOf("box") >= 0 || lower.indexOf("widget") >= 0 || lower.indexOf("مستطیل") >= 0 || lower.indexOf("پنل") >= 0 || lower.indexOf("کادر") >= 0 || lower.indexOf("نوار") >= 0) return { command: "addRectangleShape", payload: { name: "AE Studio Rectangle", width: 500, height: 300, color: [0.82, 0.95, 0.42] } };
        if (lower.indexOf("ellipse") >= 0 || lower.indexOf("circle") >= 0 || lower.indexOf("orb") >= 0 || lower.indexOf("badge") >= 0 || lower.indexOf("ring") >= 0 || lower.indexOf("bubble") >= 0 || lower.indexOf("blob") >= 0 || lower.indexOf("دایره") >= 0 || lower.indexOf("بیضی") >= 0 || lower.indexOf("حلقه") >= 0 || lower.indexOf("مدال") >= 0 || lower.indexOf("بادک") >= 0) return { command: "addEllipseShape", payload: { name: "AE Studio Ellipse", width: 300, height: 300, color: [1, 0.55, 0.35] } };
        if (lower.indexOf("triangle") >= 0 || lower.indexOf("مثلث") >= 0 || lower.indexOf("polygon") >= 0 || lower.indexOf("star") >= 0 || lower.indexOf("ستاره") >= 0 || lower.indexOf("چندضلعی") >= 0) return { command: "addRectangleShape", payload: { name: "AE Studio Shape", width: 420, height: 420, color: [0.95, 0.75, 0.3] } };
        if (lower.indexOf("camera") >= 0 || lower.indexOf("3d") >= 0 || lower.indexOf("perspective") >= 0 || lower.indexOf("دوربین") >= 0 || lower.indexOf("دید") >= 0) return { command: "addCamera", payload: { name: "AE Studio Camera" } };
        if (lower.indexOf("light") >= 0 || lower.indexOf("rim light") >= 0 || lower.indexOf("key light") >= 0 || lower.indexOf("fill light") >= 0 || lower.indexOf("نور") >= 0 || lower.indexOf("روشنایی") >= 0) return { command: "addLight", payload: { name: "AE Studio Light" } };
        if (lower.indexOf("shadow") >= 0 || lower.indexOf("drop shadow") >= 0 || lower.indexOf("soft shadow") >= 0 || lower.indexOf("سایه") >= 0 || lower.indexOf("سایه نرم") >= 0) return { command: "addDropShadow", payload: { opacity: 60, distance: 5 } };
        if (lower.indexOf("blur") >= 0 || lower.indexOf("soften") >= 0 || lower.indexOf("defocus") >= 0 || lower.indexOf("محو") >= 0 || lower.indexOf("بلور") >= 0 || lower.indexOf("نرم کردن") >= 0 || lower.indexOf("تار") >= 0) return { command: "addGaussianBlur", payload: { amount: 12 } };
        if (lower.indexOf("duplicate") >= 0 || lower.indexOf("کپی") >= 0 || lower.indexOf("تکثیر") >= 0) return { command: "duplicateSelectedLayer", payload: {} };
        if (lower.indexOf("delete") >= 0 || lower.indexOf("remove") >= 0 || lower.indexOf("حذف") >= 0) return { command: "removeSelectedLayers", payload: {} };
        if (lower.indexOf("render now") >= 0 || lower.indexOf("start render") >= 0 || lower.indexOf("رندر کن") >= 0) return { command: "renderQueue", payload: {} };
        if (lower.indexOf("render queue") >= 0 || lower.indexOf("صف رندر") >= 0) return { command: "queueComposition", payload: {} };
        if (lower.indexOf("save") >= 0 || lower.indexOf("ذخیره") >= 0) return { command: "saveProject", payload: {} };
        if (lower.indexOf("search google") >= 0 || lower.indexOf("جستجو") >= 0 || lower.indexOf("گوگل") >= 0) return { command: "searchWeb", payload: { query: text.replace(/.*(?:search google|جستجو|گوگل)\s*/i, "").trim() } };
        if (lower.indexOf("download http") >= 0 || lower.indexOf("دانلود http") >= 0) {
            var downloadUrl = text.match(/https?:\/\/\S+/i);
            return { command: "downloadAsset", payload: { url: downloadUrl ? downloadUrl[0] : "" } };
        }
        if (lower.indexOf("import") >= 0 || lower.indexOf("وارد") >= 0 || lower.indexOf("ایمپورت") >= 0) {
            var path = text.match(/(?:import|وارد|ایمپورت)\s+["“”']?([^"“”']+)["“”']?/i);
            return { command: "importFootage", payload: { path: path ? path[1].trim() : "" } };
        }
        if (lower.indexOf("opacity") >= 0 || lower.indexOf("fade") >= 0 || lower.indexOf("transparency") >= 0 || lower.indexOf("شفافیت") >= 0 || lower.indexOf("فِد") >= 0 || lower.indexOf("محو شدن") >= 0) {
            var opacity = text.match(/(\d+(?:\.\d+)?)\s*%?/);
            if (lower.indexOf("animate") >= 0 || lower.indexOf("انیمیشن") >= 0 || lower.indexOf("متحرک") >= 0 || lower.indexOf("fade") >= 0 || lower.indexOf("فِد") >= 0) return { command: "animateSelectedOpacity", payload: { from: 0, to: opacity ? Number(opacity[1]) : 100, duration: 1 } };
            return { command: "updateSelectedLayer", payload: { opacity: opacity ? Number(opacity[1]) : 100 } };
        }
        if (lower.indexOf("rename") >= 0 || lower.indexOf("تغییر نام") >= 0 || lower.indexOf("name it") >= 0 || lower.indexOf("نامگذاری") >= 0) {
            var newName = text.split(/rename|تغییر نام|name it|نامگذاری/i)[1];
            return { command: "updateSelectedLayer", payload: { name: newName ? newName.trim() : "AE Studio Layer" } };
        }
        if (lower.indexOf("move") >= 0 || lower.indexOf("position") >= 0 || lower.indexOf("translate") >= 0 || lower.indexOf("shift") >= 0 || lower.indexOf("جابجا") >= 0 || lower.indexOf("موقعیت") >= 0 || lower.indexOf("انتقال") >= 0) {
            var numbers = (text.match(/-?\d+(?:\.\d+)?/g) || []).slice(0, 2).map(Number);
            return { command: "transformSelectedLayer", payload: { position: numbers.length >= 2 ? [numbers[0], numbers[1]] : [200, 200] } };
        }
        if (lower.indexOf("scale") >= 0 || lower.indexOf("resize") >= 0 || lower.indexOf("بزرگ") >= 0 || lower.indexOf("کوچک") >= 0 || lower.indexOf("مقیاس") >= 0) {
            var scale = text.match(/(\d+(?:\.\d+)?)%?/);
            return { command: "transformSelectedLayer", payload: { scale: [scale ? Number(scale[1]) : 100, scale ? Number(scale[1]) : 100] } };
        }
        if (lower.indexOf("rotate") >= 0 || lower.indexOf("spin") >= 0 || lower.indexOf("turn") >= 0 || lower.indexOf("چرخش") >= 0 || lower.indexOf("چرخیدن") >= 0 || lower.indexOf("چرخ") >= 0) {
            var degrees = text.match(/-?\d+(?:\.\d+)?/);
            return { command: "transformSelectedLayer", payload: { rotation: degrees ? Number(degrees[0]) : 0 } };
        }
        if (lower.indexOf("build") >= 0 || lower.indexOf("create") >= 0 || lower.indexOf("make") >= 0 || lower.indexOf("generate") >= 0 || lower.indexOf("produce") >= 0 || lower.indexOf("design") >= 0 || lower.indexOf("set up") >= 0 || lower.indexOf("new") >= 0 || lower.indexOf("composition") >= 0 || lower.indexOf("ساخت") >= 0 || lower.indexOf("بساز") >= 0 || lower.indexOf("ایجاد") >= 0) {
            var size = text.match(/(\d{3,5})\s*[x×]\s*(\d{3,5})/i);
            var duration = text.match(/(\d+(?:\.\d+)?)\s*(?:sec|second|seconds|ثانیه)/i);
            var fps = text.match(/(\d+)\s*(?:fps|frame)/i);
            return { command: "createProject", payload: { name: "AE Studio Project", width: size ? Number(size[1]) : 1920, height: size ? Number(size[2]) : 1080, duration: duration ? Number(duration[1]) : 10, frameRate: fps ? Number(fps[1]) : 30 } };
        }
        if (lower.indexOf("resize") >= 0 || lower.indexOf("change composition") >= 0 || lower.indexOf("ابعاد") >= 0) {
            var compositionSize = text.match(/(\d{3,5})\s*[x×]\s*(\d{3,5})/i);
            return { command: "updateComposition", payload: { width: compositionSize ? Number(compositionSize[1]) : undefined, height: compositionSize ? Number(compositionSize[2]) : undefined } };
        }
        if (lower.indexOf("open composition") >= 0 || lower.indexOf("باز کردن") >= 0 || lower.indexOf("بازکن") >= 0) {
            var compositionName = text.replace(/.*(?:open composition|باز کردن|بازکن)\s*/i, "").trim();
            return { command: "openComposition", payload: { name: compositionName } };
        }
        if (lower.indexOf("open project") >= 0 || lower.indexOf("پروژه را باز") >= 0) {
            var projectPath = text.match(/(?:open project|پروژه را باز)\s+["“”']?([^"“”']+)["“”']?/i);
            return { command: "openProject", payload: { path: projectPath ? projectPath[1].trim() : "" } };
        }
        return null;
    }

    function hasBuildIntent(text) {
        return /\b(?:build|create|make|generate|produce|design|set up)\b/i.test(text) || /(?:بساز|بسازید|ساختن|ساخت|ایجاد|درست|طراحی|تولید)/i.test(text);
    }

    function hasExplicitActionIntent(text) {
        return /\b(?:build|create|make|generate|produce|design|set up|add|import|save|open|update|resize|animate|render|queue|delete|remove|duplicate|inspect|check|run|execute)\b/i.test(text) ||
            /(?:بساز|بسازید|ساختن|ساخت|ایجاد کن|درست کن|طراحی کن|تولید کن|اضافه کن|وارد کن|ذخیره کن|باز کن|تغییر بده|تغییرش بده|کوچک|بزرگ|متحرک|انیمیشن|رندر|صف رندر|حذف کن|پاک کن|کپی کن|بررسی کن|وضعیت پروژه|اجرا کن|انجام بده|اصلاح کن|دوباره|اسکریپت|کد|ExtendScript)/i.test(text);
    }

    function conversationalFallbackReply(text) {
        if (/(?:عنوان|تیتر|title|headline|name)/i.test(text)) {
            return "چند پیشنهاد عنوان کوتاه و خلاقانه:\n۱. لحظه‌ی نو\n۲. شروع متفاوت\n۳. قابِ ایده‌ها\n۴. یک قدم جلوتر\n۵. داستانی که می‌درخشد\nاگر لحن مشخصی مثل رسمی، هیجان‌انگیز یا مینیمال می‌خواهی، بگو تا پیشنهادها را دقیق‌تر کنم.";
        }
        return "حتماً. درباره این ایده می‌توانیم گفتگو و ایده‌پردازی کنیم؛ اگر می‌خواهی آن را در After Effects اجرا کنم، صریحاً بگو «بساز» یا «اجرا کن».";
    }

    function send(text) {
        if (!text || pending) return;
        addMessage(text, "user");
        syncSharedMemory("user", text);
        input.value = "";
        pending = true;
        if (chatMode === "ask" && (/\b(?:execute|run|apply)\s+(?:the\s+)?plan\b/i.test(text) || /(?:اجرای برنامه|اجرای پلن|این برنامه را اجرا کن)/i.test(text))) {
            finishMessage(uiText("Ask mode does not execute plans. Switch to Agent mode first.", "حالت پرسش برنامه‌ها را اجرا نمی‌کند. ابتدا حالت عامل را انتخاب کنید."));
            return;
        }
        if (/\b(?:execute|run|apply)\s+(?:the\s+)?plan\b/i.test(text) || /(?:اجرای برنامه|اجرای پلن|این برنامه را اجرا کن)/i.test(text)) {
            if (!lastWorkflowPlan || !Array.isArray(lastWorkflowPlan.recommendedCommands) || !lastWorkflowPlan.recommendedCommands.length) {
                finishMessage(uiText("There is no workflow plan to execute yet. Ask me to plan the workflow first.", "هنوز برنامه‌ای برای اجرا وجود ندارد. ابتدا از من بخواهید روند کاری را برنامه‌ریزی کنم."));
                return;
            }
            executeRequest({ commands: lastWorkflowPlan.recommendedCommands }, true);
            return;
        }
        var request = chatMode === "ask" ? null : parseRequest(text);
        if (hasBuildIntent(text) && request && !request.commands && ["buildAudioTeaser", "runScript"].indexOf(request.command) < 0) request = null;
        var lowerText = text.toLowerCase();
        if ((lowerText.indexOf("سرقت") >= 0 || lowerText.indexOf("دزدی") >= 0 || lowerText.indexOf("theft") >= 0 || lowerText.indexOf("robbery") >= 0) && (lowerText.indexOf("تیزر") >= 0 || lowerText.indexOf("teaser") >= 0 || lowerText.indexOf("project") >= 0 || lowerText.indexOf("پروژه") >= 0)) {
            executeRequest({ commands: [{ command: "buildAntiTheftTeaser", payload: {} }] }, false);
            return;
        }
        if ((lowerText.indexOf("تیزر") >= 0 || lowerText.indexOf("teaser") >= 0) && lowerText.indexOf("audio teaser") < 0 && lowerText.indexOf("voiceover teaser") < 0 && lowerText.indexOf("تیزر صوتی") < 0 && lowerText.indexOf("تیزر با صوت") < 0) {
            executeRequest(teaserProductionPlan(), false);
            return;
        }
        if (lowerText.indexOf("help") >= 0 || lowerText.indexOf("how do") >= 0 || lowerText.indexOf("راهنما") >= 0 || lowerText.indexOf("چطور") >= 0 || lowerText.indexOf("چگونه") >= 0) {
            addMessage(learningGuide(), "assistant");
            pending = false;
            return;
        }
        if (request && request.commands) {
            executeRequest(request, false);
            return;
        }
        if (request && !validateRequest(request)) {
            addMessage("The command parameters are outside the supported range.", "assistant");
            pending = false;
            return;
        }
        if (!request && (offlineFirst || provider.endpoint)) {
            addMessage("Asking your AI provider…", "assistant");
            askProvider(text, function (aiRequest, usage) {
                if (!aiRequest || aiRequest.error) { finishMessage(aiRequest && aiRequest.error ? aiRequest.error : "No provider configured.", false); return; }
                if (aiRequest.reply) {
                    recordUsage(usage);
                    var fallbackRequest = hasExplicitActionIntent(text) ? parseRequest(text) : null;
                    if (chatMode !== "ask" && fallbackRequest && validateRequest(fallbackRequest)) {
                        executeRequest({ commands: [fallbackRequest] }, false, usage);
                        return;
                    }
                    finishMessage(aiRequest.reply);
                    return;
                }
                if (chatMode === "ask" && (aiRequest.commands || aiRequest.command)) {
                    finishMessage(uiText("Ask mode returned an executable action, so it was not run.", "مدل در حالت پرسش یک عملیات اجرایی برگرداند؛ اجرا نشد."));
                    return;
                }
                executeRequest(aiRequest, true, usage);
            });
            return;
        }
        if (!request) {
            addMessage("I can create compositions, add text or solid layers, import footage, rename or animate selected layers, save projects, queue renders, inspect the project, or run ExtendScript.", "assistant");
            pending = false;
            return;
        }
        executeRequest({ commands: [request] }, false);
    }

    function finishMessage(message, persistMemory) {
        message = localizeUiMessage(String(message));
        var bubbles = messages.querySelectorAll(".assistant .bubble");
        if (bubbles.length) bubbles[bubbles.length - 1].textContent = message;
        if (persistMemory !== false) syncSharedMemory("assistant", message);
        setStudioActivity(message, message.indexOf("stopped") >= 0 || message.indexOf("failed") >= 0 ? "error" : "success");
        refreshStudioSummary();
        pending = false;
    }

    function verifyCompletedPlan(commands) {
        setStudioActivity(uiText("Verifying the After Effects result…", "در حال بررسی نتیجه در After Effects…"), "busy");
        hostCall("summary", {}, function (summary) {
            hostCall("healthReport", {}, function (health) {
                if (!summary || summary.ok === false || !health || health.ok === false) {
                    var verificationFailure = health && health.message ? health.message : summary && summary.message ? summary.message : "After Effects verification failed.";
                    recordOperation({ status: "verification-failed", commands: commands, message: verificationFailure });
                    finishMessage(uiText("Plan executed, but verification failed: " + verificationFailure, "برنامه اجرا شد، اما بررسی نتیجه ناموفق بود: " + verificationFailure));
                    return;
                }
                var projectName = summary && summary.project ? String(summary.project).split(/[\\/]/).pop() : "active project";
                var activeItem = summary && summary.activeItem ? summary.activeItem : "no active composition reported";
                var layerCount = summary && summary.layerCount !== undefined ? summary.layerCount : "unknown";
                var issueCount = health && health.issueCount !== undefined ? health.issueCount : "unknown";
                var warningCount = health && health.warningCount !== undefined ? health.warningCount : "unknown";
                var activeComposition = (summary.compositions || []).filter(function (composition) { return composition.name === activeItem; })[0];
                var verificationIssues = [];
                (commands || []).forEach(function (command) {
                    var payload = command.payload || {};
                    if (command.command === "createProject" && !(summary.compositions || []).some(function (composition) { return composition.name === payload.name; })) verificationIssues.push("Composition not found: " + (payload.name || "unnamed"));
                    if (command.command === "addTextLayer" && (!activeComposition || !activeComposition.layerItems.some(function (layer) { return layer.name === (payload.name || payload.text) || layer.text === payload.text; }))) verificationIssues.push("Text layer not found: " + (payload.name || payload.text || "unnamed"));
                    if (command.command === "animateSelectedPosition" && (!activeComposition || !activeComposition.layerItems.some(function (layer) { return layer.keyframes && layer.keyframes.position >= 2; }))) verificationIssues.push("Position keyframes were not verified.");
                    if (command.command === "queueComposition" && (!summary.renderQueueItems || !summary.renderQueueItems.some(function (item) { return item.composition === activeItem; }))) verificationIssues.push("Render Queue item was not verified.");
                });
                if (verificationIssues.length) { recordOperation({ status: "verification-failed", commands: commands, message: verificationIssues.join("; ") }); finishMessage(uiText("Execution was not verified: " + verificationIssues.join("; "), "اجرا قابل تأیید نبود: " + verificationIssues.join("؛ "))); return; }
                offlineContextState = Object.assign({}, offlineContextState, { activeProject: projectName, activeComposition: activeItem, selectedLayers: summary.selectedLayers || [], lastCreatedItem: activeItem, lastCreatedLayer: summary.selectedLayers && summary.selectedLayers[0] ? summary.selectedLayers[0].name : offlineContextState.lastCreatedLayer, lastAction: "verification", lastResult: { issueCount: issueCount, warningCount: warningCount }, sessionTimeline: (offlineContextState.sessionTimeline || []).concat([{ at: new Date().toISOString(), action: "verification", composition: activeItem }]).slice(-100) });
                window.localStorage.setItem("aeBossOfflineContext", JSON.stringify(offlineContextState));
                window.localStorage.setItem("aeBossLastComposition", activeItem || "");
                if (summary.selectedLayers && summary.selectedLayers[0]) window.localStorage.setItem("aeBossLastCreatedLayer", summary.selectedLayers[0].name || "");
                recordOperation({ status: "verified", commands: commands, message: "Project: " + projectName + "; composition: " + activeItem + "; layers: " + layerCount + "; issues: " + issueCount + "; warnings: " + warningCount });
                finishMessage(uiText("Plan completed and verified.\nProject: " + projectName + "\nComposition: " + activeItem + "\nLayers: " + layerCount + "\nHealth issues: " + issueCount + "\nWarnings: " + warningCount, "برنامه اجرا و بررسی شد.\nپروژه: " + projectName + "\nکامپوزیشن: " + activeItem + "\nلایه‌ها: " + layerCount + "\nخطاهای سلامت: " + issueCount + "\nهشدارها: " + warningCount));
            });
        });
    }

    function executeRequest(request, fromProvider, usage) {
        recordUsage(usage);
        var commands = request.commands || [];
        activeOperationId = "op-" + Date.now();
        if (commands.length && commands.some(function (command) { return !isReadOnlyCommand(command.command); })) {
            var planSummary = commands.map(function (command, index) {
                var payload = command.payload || {};
                var target = payload.name || payload.path || payload.text || payload.index || "current project";
                return (index + 1) + ". " + command.command + " -> " + String(target).slice(0, 120);
            }).join("\n");
            var approved = window.confirm("AE Studio plan:\n\n" + planSummary + "\n\nApply this plan to After Effects?");
            if (!approved) {
                recordOperation({ status: "cancelled", commands: commands });
                finishMessage("Plan cancelled before execution.");
                return;
            }
        }
        recordOperation({ status: "approved", commands: commands });
        setStudioActivity(commands.length > 1 ? uiText("Preparing " + commands.length + " studio steps…", "در حال آماده‌سازی " + commands.length + " مرحله…") : uiText("Working in After Effects…", "در حال اجرا در After Effects…"), "busy");
        addMessage(commands.length > 1 ? uiText("Running plan (0/" + commands.length + ")…", "در حال اجرای برنامه (۰/" + commands.length + ")…") : uiText("Working in After Effects…", "در حال اجرا در After Effects…"), "assistant");
        executePlan(commands, fromProvider, 0, 0);
    }

    function isReadOnlyCommand(command) {
        return ["summary", "healthReport", "inspectLayer", "searchWeb", "planWorkflow", "runValidationHarness"].indexOf(command) >= 0;
    }

    function executePlan(commands, fromProvider, index, repairAttempt) {
        if (index >= commands.length) { recordOperation({ status: "completed", commands: commands }); verifyCompletedPlan(commands); return; }
        var request = commands[index];
        if (offlineFirst && ["searchWeb", "downloadAsset", "generateImage", "generateAudio", "generateVideo", "buildAudioTeaser"].indexOf(request.command) >= 0) {
            finishMessage(uiText("Offline Core blocked a network-dependent operation. Disable Offline Core explicitly to use external providers.", "هسته آفلاین یک عملیات وابسته به شبکه را مسدود کرد. برای استفاده از سرویس‌های خارجی، حالت آفلاین را صریحاً غیرفعال کنید."));
            return;
        }
        if (request.command === "planWorkflow") {
            var workflowPlan = productionWorkflowPlan(request.payload || {});
            recordOperation({ status: "planned", command: request.command, message: workflowPlan.message });
            finishMessage(formatWorkflowPlan(workflowPlan));
            return;
        }
        if ((request.command === "runScript" || request.command === "setOpacityExpression") && !window.confirm("Step " + (index + 1) + " requests code execution in After Effects. Continue?")) { finishMessage("Plan cancelled at step " + (index + 1) + "."); return; }
        if (fromProvider && request.command === "snapshotProject" && !window.confirm("Step " + (index + 1) + " will save the current project and create a reversible snapshot. Continue?")) { finishMessage("Plan cancelled at step " + (index + 1) + "."); return; }
        if (fromProvider && request.command === "restoreSnapshot" && !window.confirm("Step " + (index + 1) + " will open a snapshot as a separate After Effects project. Continue?")) { finishMessage("Plan cancelled at step " + (index + 1) + "."); return; }
        if (fromProvider && request.command === "removeSelectedLayers" && !window.confirm("Step " + (index + 1) + " will delete selected layers. Continue?")) { finishMessage("Plan cancelled at step " + (index + 1) + "."); return; }
        if (fromProvider && request.command === "renderQueue" && !window.confirm("Step " + (index + 1) + " will start the Render Queue. Continue?")) { finishMessage("Plan cancelled at step " + (index + 1) + "."); return; }
        if (fromProvider && ["generateImage", "generateAudio", "generateVideo"].indexOf(request.command) >= 0 && !window.confirm("Step " + (index + 1) + " will call a media AI provider and may incur usage cost. Continue?")) { finishMessage("Plan cancelled at step " + (index + 1) + "."); return; }
        if (request.command === "buildAudioTeaser") {
            if (fromProvider && !window.confirm("This step will generate audio and build a teaser in After Effects. Continue?")) { finishMessage("Plan cancelled at step " + (index + 1) + "."); return; }
            runAudioTeaser(request, function (result) { handlePlanResult(result); });
            return;
        }
        var requiresComposition = ["addTextLayer", "addSolidLayer", "addRectangleShape", "addEllipseShape", "addCamera", "addLight", "queueComposition", "updateComposition", "openComposition"].indexOf(request.command) >= 0;
        var requiresLayer = ["transformSelectedLayer", "animateSelectedOpacity", "animateSelectedPosition", "editLayer", "updateSelectedLayer", "addDropShadow", "addGaussianBlur", "setOpacityExpression"].indexOf(request.command) >= 0;
        if (requiresComposition || requiresLayer) {
            hostCall("summary", {}, function (preflightSummary) {
                var hasComposition = !!(preflightSummary && preflightSummary.ok !== false && preflightSummary.activeType === "Composition");
                var hasLayer = !!(hasComposition && preflightSummary.selectedLayers && preflightSummary.selectedLayers.length);
                if (!hasComposition || requiresLayer && !hasLayer) {
                    var reason = !hasComposition ? "No active composition is selected." : "No layer is selected.";
                    recordOperation({ status: "not-executed", command: request.command, message: reason });
                    finishMessage("NOT EXECUTED: " + request.command + ". " + reason);
                    return;
                }
                hostCall(request.command, request.payload, function (result) { handlePlanResult(result); });
            });
            return;
        }
        if (["searchWeb", "downloadAsset", "generateImage", "generateAudio", "generateVideo"].indexOf(request.command) >= 0) {
            if (fromProvider && ["downloadAsset", "generateImage", "generateAudio", "generateVideo"].indexOf(request.command) >= 0 && !window.confirm("This step will download or generate media and may use external services. Continue?")) { finishMessage("Plan cancelled at step " + (index + 1) + "."); return; }
            runExternalTool(request, function (result) { handlePlanResult(result); });
            return;
        }
        hostCall(request.command, request.payload, function (result) { handlePlanResult(result); });

        function handlePlanResult(result) {
            if (request.command === "runValidationHarness" && result && result.report) {
                var harnessReport = result.report;
                result.message = "Runtime Harness: " + (harnessReport.suitePassed ? "PASS" : "FAIL") + " | " + (harnessReport.tests || []).map(function (test) { return test.id + "=" + test.status; }).join(", ");
            }
            var operationResult = { status: result && result.ok === false ? "failed" : "step-completed", command: request.command, message: result && result.message ? result.message : "ok" };
            if (request.command === "runScript") operationResult.scriptLength = String(request.payload && request.payload.source || "").length;
            recordOperation(operationResult);
            if (result && result.ok === false) {
                if ((fromProvider || request.command === "runScript") && !repairAttempt) {
                            setStudioActivity(uiText("The model is repairing step " + (index + 1) + "…", "مدل در حال اصلاح مرحله " + (index + 1) + " است…"), "busy");
                    askProvider("Repair and retry the failed After Effects step. The command " + request.command + " failed with: " + result.message + ". The previous user message contains the source when this was a script. Return exactly one corrected executable runScript JSON command for the same step, with no markdown and no explanation.", function (repair, repairUsage) {
                        if (repair && !repair.error && (repair.commands || repair.command || repair.script || repair.extendScript || repair.code)) {
                            var repairedCommands = repair.commands || [repair];
                            repairedCommands = repairedCommands.map(normalizeCommand);
                            if (repairedCommands.length !== 1 || repairedCommands[0].command !== "runScript" || !validateRequest(repairedCommands[0])) {
                                finishMessage("The repair response was not a valid runScript command.");
                                return;
                            }
                            executePlan(repairedCommands, true, 0, 1);
                            return;
                        }
                        finishMessage("Plan stopped at step " + (index + 1) + ": " + result.message);
                    });
                    return;
                }
                finishMessage("Plan stopped at step " + (index + 1) + ": " + result.message);
                return;
            }
            if (commands.length > 1) {
                var bubbles = messages.querySelectorAll(".assistant .bubble");
                if (bubbles.length) bubbles[bubbles.length - 1].textContent = "Running plan (" + (index + 1) + "/" + commands.length + ")…";
            }
            setStudioActivity("Completed step " + (index + 1) + " of " + commands.length + "…", "busy");
            refreshStudioSummary();
            executePlan(commands, fromProvider, index + 1, repairAttempt);
        }
    }

    function generateMedia(request, callback) {
        var kind = request.command.replace("generate", "").toLowerCase();
        fetch("http://127.0.0.1:43127/v1/media", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: kind, prompt: request.payload.prompt, size: request.payload.size, duration: request.payload.duration, format: request.payload.format, fileName: request.payload.fileName }) }).then(function (response) { return response.json().then(function (body) { if (!response.ok) throw new Error(body.error || "Media generation failed."); return body; }); }).then(function (body) {
            hostCall("importFootage", { path: body.path, name: request.payload.fileName }, callback);
        }).catch(function (error) { callback({ ok: false, message: error.message }); });
    }

    function runAudioTeaser(request, callback) {
        var data = request.payload || {};
        fetch("http://127.0.0.1:43127/v1/media", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "audio", prompt: data.prompt, duration: data.duration || 15, format: data.format || "mp3", fileName: data.fileName || "ae-studio-audio-teaser.mp3" }) }).then(function (response) {
            return response.json().then(function (body) { if (!response.ok) throw new Error(body.error || "Audio generation failed."); return body; });
        }).then(function (body) {
            hostCall("buildAudioTeaser", { name: data.name, title: data.title, subtitle: data.subtitle, width: data.width, height: data.height, duration: data.duration || 15, frameRate: data.frameRate || 30, audioPath: body.path, audioName: data.audioName }, callback);
        }).catch(function (error) { callback({ ok: false, message: error.message }); });
    }

    function runExternalTool(request, callback) {
        var endpoint = request.command === "searchWeb" ? "http://127.0.0.1:43127/v1/search" : request.command === "downloadAsset" ? "http://127.0.0.1:43127/v1/download" : "http://127.0.0.1:43127/v1/media";
        var body = request.command === "searchWeb" ? { query: request.payload.query } : request.command === "downloadAsset" ? { url: request.payload.url, fileName: request.payload.fileName } : { kind: request.command.replace("generate", "").toLowerCase(), prompt: request.payload.prompt, size: request.payload.size, duration: request.payload.duration, format: request.payload.format, fileName: request.payload.fileName };
        fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(function (response) { return response.json().then(function (result) { if (!response.ok) throw new Error(result.error || "External tool failed."); return result; }); }).then(function (result) {
            if (request.command === "downloadAsset" || request.command.indexOf("generate") === 0) return hostCall("importFootage", { path: result.path, name: request.payload.fileName }, callback);
            callback({ ok: true, message: JSON.stringify(result.items || result) });
        }).catch(function (error) { callback({ ok: false, message: error.message }); });
    }

    var voiceButton = document.getElementById("voiceButton");
    var voice = window.AEBossVoice ? window.AEBossVoice({ language: language === "fa" ? "fa-IR" : "en-US", onInterim: function (text) { input.value = text; } }) : null;
    if (voiceButton) voiceButton.addEventListener("click", function () {
        if (!voice) { addMessage(uiText("Voice module is unavailable.", "ماژول صوتی در دسترس نیست."), "assistant"); return; }
        if (!voice.supported()) { addMessage(uiText("Browser voice recognition is not available here. You can use a Chromium-based CEP panel or configure an audio transcription endpoint.", "تشخیص گفتار مرورگر در این محیط در دسترس نیست. از پنل CEP مبتنی بر Chromium یا سرویس تبدیل صوت به متن استفاده کنید."), "assistant"); return; }
        voiceButton.disabled = true; voiceButton.textContent = "●";
        voice.start(language === "fa" ? "fa-IR" : "en-US").then(function (result) {
            input.value = result.transcript;
            addMessage(uiText("Voice understood: ", "دستور صوتی دریافت شد: ") + result.transcript, "assistant");
            send(result.transcript);
        }).catch(function (error) { addMessage(uiText("Voice input failed: ", "ورودی صوتی ناموفق بود: ") + error.message, "assistant"); }).finally(function () { voiceButton.disabled = false; voiceButton.textContent = "🎙"; });
    });

    window.AEBossOfflineStatus = function (callback) {
        if (!window.AEBossOffline || !window.AEBossOffline.health) { callback({ ok: false, error: "OFFLINE_CORE_UNAVAILABLE" }); return; }
        window.AEBossOffline.health(callback);
    };

    form.addEventListener("submit", function (event) { event.preventDefault(); send(input.value.trim()); });
    input.addEventListener("keydown", function (event) {
        if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); form.dispatchEvent(new Event("submit")); }
        input.style.height = "auto";
        input.style.height = Math.min(input.scrollHeight, 120) + "px";
    });
    document.querySelectorAll("[data-prompt]").forEach(function (button) { button.addEventListener("click", function () { send(button.getAttribute("data-prompt")); }); });
    document.querySelectorAll("[data-studio-view]").forEach(function (button) {
        button.addEventListener("click", function () {
            document.querySelectorAll("[data-studio-view]").forEach(function (item) { item.classList.remove("active"); });
            button.classList.add("active");
            var view = button.getAttribute("data-studio-view");
            var prompts = { create: "Create a new cinematic 1920x1080 composition named AI Storyboard, 8 seconds at 24 fps", animate: "Animate the selected layer opacity from 0 to 100 over 1 second", assets: "Import media from the file path I provide next", render: "Add the active composition to the render queue" };
            input.placeholder = view.charAt(0).toUpperCase() + view.slice(1) + " mode — describe what you want to do...";
            input.focus();
            if (view === "render") send(prompts[view]);
        });
    });
    document.getElementById("attachButton").addEventListener("click", function () {
        if (isCep && window.cep && cep.fs && cep.fs.showOpenDialog) {
            cep.fs.showOpenDialog(false, false, "Import media", "", ["mp4", "mov", "m4v", "png", "jpg", "jpeg", "wav", "mp3"], function (result) {
                if (result && result.data && result.data.length) send("Import \"" + result.data[0] + "\"");
            });
            return;
        }
        var path = window.prompt("Enter the full media file path");
        if (path) send("Import \"" + path + "\"");
    });
    document.getElementById("clearButton").addEventListener("click", function () { messages.innerHTML = ""; conversation = []; tokenTotals = { prompt: 0, completion: 0, total: 0, estimated: false }; window.localStorage.removeItem("aeStudioConversation"); window.localStorage.removeItem("aeStudioTokenTotals"); fetch(bridgeMemoryEndpoint, { method: "DELETE" }).catch(function () {}); tokenUsage.textContent = "0 tok"; });
    document.getElementById("settingsButton").addEventListener("click", function () { settingsModal.hidden = false; endpointInput.focus(); });
    connectCopilot.addEventListener("click", function () {
        probeCopilot().then(function (connected) {
            if (connected) return;
            if (provider.endpoint) { settingsModal.hidden = false; endpointInput.focus(); return; }
            openCopilotLogin();
            addMessage("No HADI or GitHub Copilot model is available. Start HADI in VS Code, or sign in to GitHub Copilot, then press Connect again.", "assistant");
        });
    });
    document.getElementById("closeSettings").addEventListener("click", function () { settingsModal.hidden = true; });
    providerTypeInput.addEventListener("change", function () {
        var current = providerTypeInput.value || "auto";
        if (offlineModeInput) offlineModeInput.value = current === "offline" ? "on" : "off";
        saveProviderProfile(providerTypeInput.dataset.loadedType || provider.type || "auto");
        loadProviderProfile(current);
    });
    document.getElementById("saveSettings").addEventListener("click", function () {
        if (offlineModeInput) { offlineFirst = offlineModeInput.value !== "off"; window.localStorage.setItem("aeBossOfflineMode", offlineFirst ? "on" : "off"); }
        var selectedType = offlineFirst ? "offline" : (providerTypeInput.value || "auto");
        var selectedEndpoint = offlineFirst ? "" : endpointInput.value.trim();
        if (["auto", "ollama", "lm-studio", "hadi", "copilot"].indexOf(selectedType) >= 0 && !selectedEndpoint) selectedEndpoint = "http://127.0.0.1:43127/v1/chat/completions";
        provider = { type: selectedType, endpoint: selectedEndpoint, model: modelInput.value, apiKey: isLocalProvider(selectedType) ? "" : apiKeyInput.value, tokenBudget: Number(tokenBudgetInput.value) || 0, temperature: Number(temperatureInput.value) || 0.1 };
        providerTypeInput.dataset.loadedType = selectedType;
        saveProviderProfile(selectedType);
        window.localStorage.setItem("aeStudioProvider", JSON.stringify(provider));
        window.localStorage.setItem("aeStudioProviderProfiles", JSON.stringify(providerProfiles));
        modeLabel.textContent = offlineFirst ? uiText("OFFLINE CORE", "هسته آفلاین") : (provider.endpoint ? uiText("AI CONNECTED", "هوش مصنوعی متصل است") : (isCep ? uiText("LIVE BRIDGE", "پل زنده") : uiText("MOCK MODE", "حالت آزمایشی")));
        settingsModal.hidden = true;
        addMessage(provider.endpoint ? (selectedType === "hadi" ? "HADI connected. I will use HADI for requests I cannot handle locally." : "AI provider connected. I will use it for requests I cannot handle locally.") : "Local command mode restored.", "assistant");
    });
    document.getElementById("copilotPreset").addEventListener("click", function () {
        providerTypeInput.value = "copilot";
        if (offlineModeInput) offlineModeInput.value = "off";
        endpointInput.value = "http://127.0.0.1:43127/v1/chat/completions";
        modelInput.value = "auto";
        apiKeyInput.value = "";
        refreshModels();
        addMessage("VS Code Copilot bridge preset loaded. Start the bridge in VS Code, then save this connection.", "assistant");
    });
    document.getElementById("hadiPreset").addEventListener("click", function () {
        providerTypeInput.value = "hadi";
        if (offlineModeInput) offlineModeInput.value = "off";
        endpointInput.value = "http://127.0.0.1:43127/v1/chat/completions";
        modelInput.value = "";
        apiKeyInput.value = "";
        refreshModels();
        addMessage("HADI preset loaded. Start the HADI extension in VS Code with F5, refresh models, then save this connection.", "assistant");
    });
    document.getElementById("githubCopilotLink").addEventListener("click", function () {
        openCopilotLogin();
        addMessage("GitHub sign-in opened in your browser. After signing in, enable Copilot in VS Code; this panel will connect through the local bridge.", "assistant");
    });
    document.getElementById("resetSettings").addEventListener("click", function () { endpointInput.value = ""; modelInput.value = "offline"; apiKeyInput.value = ""; tokenBudgetInput.value = ""; providerTypeInput.value = "offline"; if (offlineModeInput) offlineModeInput.value = "on"; temperatureInput.value = "0.1"; document.getElementById("saveSettings").click(); });
    document.getElementById("refreshModels").addEventListener("click", refreshModels);
    settingsModal.addEventListener("click", function (event) { if (event.target === settingsModal) settingsModal.hidden = true; });
}());
