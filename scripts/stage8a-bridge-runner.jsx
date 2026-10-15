(function () {
    try {
        $.evalFile("D:/AE_BOSS_OMEGA_Foundation_v155_Deterministic_Consistency_Evidence_Quorum_Hardening/AE_BOSS_OMEGA_Foundation_v155/runtime/ae/bridge/ae-production-runtime.jsx");
    } catch (e) {
        var f = new File("D:/AE_BOSS_OMEGA_Foundation_v155_Deterministic_Consistency_Evidence_Quorum_Hardening/AE_BOSS_OMEGA_Foundation_v155/evidence/ae/stage8a-bridge-bootstrap-failure.json");
        f.open("w");
        f.write(
            "{\n" +
            '  "stage": "STAGE_8A_BRIDGE_RUNTIME",\n' +
            '  "status": "BOOTSTRAP_FAILED",\n' +
            '  "error": "' + e.toString().replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"\n' +
            "}"
        );
        f.close();
    }
})();
