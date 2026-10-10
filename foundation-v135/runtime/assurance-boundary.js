'use strict';
function decide(x){const local=['rng','corpus','schema','hermetic'];const live=['liveAE','cep','jsx','render','evidence'];const lm=local.filter(k=>!x[k]);const vm=live.filter(k=>!x[k]);if(lm.length)return {status:'LOCAL_ASSURANCE_INCOMPLETE',localMissing:lm,liveMissing:vm};if(vm.length)return {status:'LIVE_INTEGRATION_REQUIRED',localMissing:[],liveMissing:vm};return {status:'LIVE_EVIDENCE_COMPLETE',localMissing:[],liveMissing:[]};}
module.exports={decide};
