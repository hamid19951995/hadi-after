'use strict';
const v34=require('../../foundation-v34'); const {validatePlan}=require('../policy/execution-policy'); const {buildMetrics}=require('../metrics/run-metrics');
function execute(plan,options={}){const gate=validatePlan(plan,options.policy||{}); if(!gate.ok)return {ok:false,error:gate.code,policy:gate}; const startedAt=Date.now(); const result=v34.executeProductionPlan(plan,options.execution||options); const finishedAt=Date.now(); return {...result,policy:gate,metrics:buildMetrics(result,startedAt,finishedAt)};}
function supervise(plans,options={}){const results=[]; for(const plan of plans||[]){const r=execute(plan,options); results.push(r); if(!r.ok&&(options.stopOnFailure!==false))break;} return {ok:results.every(r=>r.ok),total:results.length,completed:results.filter(r=>r.ok).length,failed:results.filter(r=>!r.ok).length,results};}
module.exports={execute,supervise};
