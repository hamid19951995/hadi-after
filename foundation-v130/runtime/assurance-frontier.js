'use strict';
function assess(x){const local=['metamorphic','minimizedFailure','coverage','reproducible'];const live=['liveAE','cep','jsx','render','evidence'];const localMissing=local.filter(k=>!x[k]);const liveMissing=live.filter(k=>!x[k]);return {status:localMissing.length?'LOCAL_ASSURANCE_INCOMPLETE':liveMissing.length?'LIVE_INTEGRATION_REQUIRED':'LIVE_EVIDENCE_COMPLETE',localMissing,liveMissing};}
module.exports={assess};
