// Stage 10: Render Queue & Output Module Automation Runner
function runStage10Render(payload) {
    try {
        var compName = payload.compName || "STAGE9_TITLES";
        var outputPath = payload.outputPath;

        var targetComp = null;
        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (item instanceof CompItem && item.name === compName) {
                targetComp = item;
                break;
            }
        }

        if (!targetComp) {
            return JSON.stringify({ status: "failed", error: "Composition not found: " + compName });
        }

        // Add to Render Queue
        var rqItem = app.project.renderQueue.items.add(targetComp);

        // Configure Output Module if path provided
        if (outputPath) {
            var outModule = rqItem.outputModule(1);
            var file = new File(outputPath);
            outModule.file = file;
        }

        // Note: We queue the item successfully without blocking the bridge IPC response on full video render.
        return JSON.stringify({
            status: "succeeded",
            compName: compName,
            outputPath: outputPath ? outputPath : "default",
            renderQueueIndex: app.project.renderQueue.numItems,
            queuedAt: new Date().toTimeString()
        });
    } catch (e) {
        return JSON.stringify({ status: "failed", error: e.toString() });
    }
}
