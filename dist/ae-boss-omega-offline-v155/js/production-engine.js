(function () {
  'use strict';
  var api = window.AEBossOffline || {};
  api.v32 = {
    buildPlan: function (plan, callback) { if (!window.AEBossOffline) return callback({ok:false,error:'OFFLINE_CORE_UNAVAILABLE'}); var req = {op:'v32_compile_plan', plan:plan}; if (typeof window.AEBossOffline.invokeV32 === 'function') return window.AEBossOffline.invokeV32(req, callback); callback({ok:false,error:'V32_RUNTIME_UNAVAILABLE'}); },
    health: function (callback) { if (!window.AEBossOffline) return callback({ok:false,error:'OFFLINE_CORE_UNAVAILABLE'}); if (typeof window.AEBossOffline.invokeV32 === 'function') return window.AEBossOffline.invokeV32({op:'health'}, callback); callback({ok:false,error:'V32_RUNTIME_UNAVAILABLE'}); },
    networkPolicy: function (callback) { if (typeof window.AEBossOffline.invokeV32 === 'function') return window.AEBossOffline.invokeV32({op:'network_policy'}, callback); callback({ok:false,error:'V32_RUNTIME_UNAVAILABLE'}); }
  };
  window.AEBossProduction = api.v32;
})();
