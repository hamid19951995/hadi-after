'use strict';
function evaluate(x){const required=['traceStable','causalConsistent','evidenceQuorum','regressionBudget'];const missing=required.filter(k=>!x[k]);if(missing.length)return {status:'LOCAL_ASSURANCE_INCOMPLETE',missing};return {status:x.liveEvidence?'LIVE_EVIDENCE_PRESENT':'LIVE_INTEGRATION_REQUIRED',missing:[]};}
module.exports={evaluate};
