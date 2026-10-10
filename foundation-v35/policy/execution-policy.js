'use strict';
function validatePlan(plan, policy={}){
  const maxOperations=Number.isFinite(policy.maxOperations)?policy.maxOperations:10000;
  const maxTimeline=Number.isFinite(policy.maxTimeline)?policy.maxTimeline:Infinity;
  const ops=[...(plan.actions||[]),...(plan.interactions||[]),...(plan.propActions||[])];
  if(!plan||!plan.fingerprint) return {ok:false,code:'PLAN_FINGERPRINT_REQUIRED'};
  if(ops.length>maxOperations) return {ok:false,code:'POLICY_MAX_OPERATIONS_EXCEEDED',count:ops.length,maxOperations};
  for(const op of ops){const end=Number(op.start||0)+Number(op.duration||0); if(end>maxTimeline)return {ok:false,code:'POLICY_MAX_TIMELINE_EXCEEDED',operationId:op.id,end,maxTimeline};}
  return {ok:true,operationCount:ops.length};
}
module.exports={validatePlan};
