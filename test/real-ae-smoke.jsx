var reportFile = new File(File($.fileName).parent.fsName + "/real-ae-smoke-result.txt");
var result = {
	timestamp: new Date().toString(),
	extendscript_runtime: "PASS",
	file_io_permissions: "FAIL",
	comp_creation: "FAIL",
	bridge_socket_status: "OFFLINE_GRACEFUL_SKIP",
	overall_status: "FAIL"
};

function jsonString(value) {
	var key;
	var output = "{";
	var first = true;
	for (key in value) {
		if (!value.hasOwnProperty(key)) continue;
		if (!first) output += ",";
		output += JSON.stringify(String(key)) + ":" + JSON.stringify(String(value[key]));
		first = false;
	}
	return output + "}";
}

function trySocket(port) {
	var socket;
	try {
		if (typeof Socket === "undefined") return false;
		socket = new Socket();
		socket.timeout = 2;
		if (!socket.open("127.0.0.1:" + port, "UTF-8")) return false;
		socket.write("PING\n");
		socket.close();
		return true;
	} catch (error) {
		try { if (socket) socket.close(); } catch (closeError) { }
		return false;
	}
}

function runDomTests() {
	var project = app.project;
	var comp = null;
	var solid = null;
	if (!project) app.newProject();
	project = app.project;
	comp = project.items.addComp("AE Hybrid Copilot Smoke", 640, 360, 1, 1, 24);
	solid = comp.layers.addSolid([0.1, 0.2, 0.3], "Smoke Solid", 640, 360, 1, 1);
	if (!comp || !solid || comp.numLayers < 1) throw new Error("Composition or solid creation failed.");
	result.comp_creation = "PASS";
	if (!reportFile.open("w")) throw new Error("Could not open smoke result file.");
	reportFile.encoding = "UTF-8";
	reportFile.write("AE Hybrid Copilot write test\n");
	reportFile.close();
	result.file_io_permissions = "PASS";
	try { if (comp) comp.remove(); } catch (cleanupError) { }
}

function writeReport() {
	var output;
	var finalFile = new File(File($.fileName).parent.fsName + "/real-ae-smoke-result.txt");
	try {
		result.overall_status = result.extendscript_runtime === "PASS" && result.file_io_permissions === "PASS" && result.comp_creation === "PASS" ? (result.bridge_socket_status === "CONNECTED" ? "PASS" : "DEGRADED") : "FAIL";
		output = jsonString(result);
		if (finalFile.open("w")) {
			finalFile.encoding = "UTF-8";
			finalFile.lineFeed = "Unix";
			finalFile.write(output);
			finalFile.close();
		}
	} catch (writeError) {
		try {
			finalFile = new File(File($.fileName).parent.fsName + "/real-ae-smoke-result.txt");
			finalFile.open("w");
			finalFile.write("{\"timestamp\":\"" + new Date().toString() + "\",\"extendscript_runtime\":\"PASS\",\"file_io_permissions\":\"FAIL\",\"comp_creation\":\"FAIL\",\"bridge_socket_status\":\"OFFLINE_GRACEFUL_SKIP\",\"overall_status\":\"FAIL\"}");
			finalFile.close();
		} catch (finalError) { }
	}
}

try {
	if (trySocket(8080) || trySocket(9999)) result.bridge_socket_status = "CONNECTED";
	runDomTests();
} catch (error) {
	result.extendscript_runtime = "PASS";
} finally {
	writeReport();
}
