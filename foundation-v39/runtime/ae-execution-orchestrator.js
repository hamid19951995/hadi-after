const crypto=require('crypto');
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
class AEExecutionOrchestrator{
 constructor({bridge,clock=()=>Date.now()}){if(!bridge)throw new Error('BRIDGE_REQUIRED');this.bridge=bridge;this.clock=clock;}
 async execute(plan){
  if(!plan||!Array.isArray(plan.operations))throw new Error('PLAN_OPERATIONS_REQUIRED');
  const fingerprint=hash({operations:plan.operations,version:'v39'});
  const results=[];
  for(let i=0;i<plan.operations.length;i++){
   const op={...plan.operations[i],sequence:i,fingerprint};
   const preview=await this.bridge.preview(op);
   if(preview.blocked) return {state:'BLOCKED',fingerprint,results,reason:preview.reason};
   const apply=await this.bridge.apply(op);
   const readback=await this.bridge.readback(op);
   const verified=!!(readback&&readback.verified);
   results.push({operationId:op.operationId,state:verified?'VERIFIED':'MISMATCH',apply,readback});
   if(!verified)return {state:'FAILED',fingerprint,results,failedOperation:op.operationId};
  }
  return {state:'COMPLETED',fingerprint,results,completedAt:this.clock()};
 }
}
module.exports={AEExecutionOrchestrator,hash};
