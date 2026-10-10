(function (root, factory) {
    "use strict";
    if (typeof module !== "undefined" && module.exports) module.exports = factory(require("./offline-core.js"));
    else root.AEBossProductionSpec = factory(root.AEBossOfflineCore);
})(typeof window !== "undefined" ? window : this, function (offlineCore) {
    "use strict";
    var VERSION = "production-spec.v1";
    function text(value) { return String(value || ""); }
    function number(patterns, source, fallback) { var match; for (var index = 0; index < patterns.length; index += 1) { match = source.match(patterns[index]); if (match) return Number(match[1]); } return fallback; }
    function has(source, pattern) { return pattern.test(source); }
    function slug(value) { return text(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 36) || "omega-production"; }
    function create(request, context) {
        var source = text(request), lower = source.toLowerCase();
        var duration = number([/(\d+(?:\.\d+)?)(?:\s|-)*(?:seconds|second|sec|ثانیه)/i], source, 10);
        var width = number([/(\d{3,5})\s*[x×]\s*\d{3,5}/i], source, 1920);
        var heightMatch = source.match(/\d{3,5}\s*[x×]\s*(\d{3,5})/i);
        var height = heightMatch ? Number(heightMatch[1]) : 1080;
        var frameRate = number([/(\d+)\s*(?:fps|فریم)/i], source, 30);
        var productionType = has(lower, /advert|promo|تبلیغ|promo/) ? "advertisement" : has(lower, /intro|معرفی|reveal/) ? "brand_intro" : "motion_graphic";
        var style = has(lower, /cinematic|سینمایی/) ? "cinematic" : has(lower, /futuristic|cyber|فناوری|امنیت/) ? "futuristic" : "premium minimal";
        var mood = has(lower, /dark|تیره|cyber|امنیت/) ? "premium dark" : "confident premium";
        var camera = has(lower, /camera|دوربین|پارالاکس|حرکت دوربین/) || style === "cinematic";
        var textSections = number([/(\d+)\s*(?:text sections|text messages|بخش متن|پیام متنی)/i], source, has(lower, /three|سه/) ? 3 : 1);
        var sceneCount = Math.max(2, Math.min(8, Math.ceil(duration / 4)));
        var scenes = [];
        for (var index = 0; index < sceneCount; index += 1) {
            var start = Number((duration * index / sceneCount).toFixed(3));
            var end = Number((duration * (index + 1) / sceneCount).toFixed(3));
            scenes.push({ id: "SCENE_" + String(index + 1).padStart(2, "0"), purpose: index === 0 ? "Atmospheric introduction" : index === sceneCount - 1 ? "Logo reveal and CTA" : "Feature and message development", start: start, end: end });
        }
        var spec = { version: VERSION, project: { name: "AE_BOSS_" + slug(source).toUpperCase(), width: width, height: height, duration: duration, frameRate: frameRate, productionType: productionType, style: style, mood: mood, camera: camera }, scenes: scenes, text: { sections: textSections, requested: has(lower, /text|title|متن|عنوان/) }, assets: { required: camera ? ["background", "glow", "logo", "text"] : ["background", "text"], missing: [], generated: [] }, render: { composition: "MASTER_MAIN", quality: has(lower, /high quality|کیفیت بالا|premium/) ? "high" : "standard", queue: true }, context: context || {}, request: source };
        spec.fingerprint = offlineCore.hash(spec);
        return spec;
    }
    function compile(spec) {
        var steps = [
            { id: "create_master", action: "createProject", input: { name: spec.render.composition, width: spec.project.width, height: spec.project.height, duration: spec.project.duration, frameRate: spec.project.frameRate }, dependsOn: [], verify: "composition.exists", capability: "ae.project.write" },
            { id: "create_background", action: "addSolidLayer", input: { name: "BACKGROUND", color: [0.015, 0.03, 0.08] }, dependsOn: ["create_master"], verify: "layer.exists", capability: "ae.project.write" },
            { id: "create_title", action: "addTextLayer", input: { name: "TITLE_MAIN", text: "AE BOSS OMEGA" }, dependsOn: ["create_background"], verify: "layer.exists", capability: "ae.project.write" }
        ];
        if (spec.project.camera) steps.push({ id: "create_camera", action: "addCamera", input: { name: "CAMERA_MAIN" }, dependsOn: ["create_master"], verify: "layer.exists", capability: "ae.project.write" });
        steps.push({ id: "animate_title", action: "animateSelectedPosition", input: { from: [200, spec.project.height / 2], to: [spec.project.width / 2, spec.project.height / 2], duration: Math.min(5, spec.project.duration) }, dependsOn: ["create_title"], verify: "keyframes.exists", capability: "ae.project.write" });
        steps.push({ id: "verify_master", action: "summary", input: {}, dependsOn: steps.map(function (step) { return step.id; }), verify: "expectedState.matches", capability: "ae.project.read" });
        steps.push({ id: "queue_master", action: "queueComposition", input: {}, dependsOn: ["verify_master"], verify: "renderQueue.containsActiveComposition", capability: "ae.render.queue" });
        return { version: VERSION, specFingerprint: spec.fingerprint, steps: steps, fingerprint: offlineCore.hash({ version: VERSION, specFingerprint: spec.fingerprint, steps: steps }) };
    }
    return { VERSION: VERSION, create: create, compile: compile };
});
