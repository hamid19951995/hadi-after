"use strict";
const crypto=require("crypto"),EventEmitter=require("events");
const canonical=v=>JSON.stringify(v??null,Object.keys(v||{}).sort());
const hash=v=>crypto.createHash("sha256").update(typeof v==="string"?v:canonical(v)).digest("hex");
const STATES=Object.freeze({PLANNING:"PLANNING",APPROVAL_REQUIRED:"APPROVAL_REQUIRED",EXECUTING:"EXECUTING",VERIFYING:"VERIFYING",DONE:"DONE",UNKNOWN:"UNKNOWN",RECOVERY_REQUIRED:"RECOVERY_REQUIRED",FAILED:"FAILED",CANCELLED:"CANCELLED"});
const terminal=s=>[STATES.DONE,STATES.FAILED,STATES.CANCELLED].includes(s);
class ProductionRuntimeV11 extends EventEmitter{
 constructor({hostAdapter,governor,snapshotManager,renderQueue,assetGraph,scheduler,audit,capabilityGuard,recoveryCoordinator,clock=()=>Date.now()}={}){
  super();for(const [k,v] of Object.entries({hostAdapter,governor,snapshotManager,renderQueue,assetGraph,scheduler,audit,capabilityGuard,recoveryCoordinator}))if(!v)throw new TypeError(k+" required");
  this.hostAdapter=hostAdapter;this.governor=governor;this.snapshotManager=snapshotManager;this.renderQueue=renderQueue;this.assetGraph=assetGraph;this.scheduler=scheduler;this.audit=audit;this.capabilityGuard=capabilityGuard;this.recoveryCoordinator=recoveryCoordinator;this.clock=clock;this.operations=new Map();
 }
 _emit(op,type,data={}){op.updatedAt=this.clock();this.audit.append(type,{operationId:op.operationId,state:op.state,...data});this.emit("state",{...op});}
 async execute(spec){
  if(!spec||!spec.operationId||!spec.action)throw new Error("INVALID_OPERATION");
  const prior=this.operations.get(spec.operationId);if(prior){if(prior.specHash!==hash(spec))throw Object.assign(new Error("IDEMPOTENCY_CONFLICT"),{code:"IDEMPOTENCY_CONFLICT"});return prior;}
  const op={operationId:spec.operationId,action:spec.action,state:STATES.PLANNING,createdAt:this.clock(),updatedAt:this.clock(),specHash:hash(spec),spec,cancelRequested:false};this.operations.set(op.operationId,op);this._emit(op,"OPERATION_PLANNED",{specHash:op.specHash});
  const graphCheck=this.assetGraph.validate();if(!graphCheck.ok){op.state=STATES.FAILED;op.error={code:"ASSET_GRAPH_INVALID",details:graphCheck};this._emit(op,"OPERATION_REJECTED",{reason:op.error.code});return op;}
  this.capabilityGuard.authorize(spec.action,{hostReady:this.governor.status().state==="READY"});
  if(spec.requiresApproval!==false){op.state=STATES.APPROVAL_REQUIRED;this._emit(op,"APPROVAL_REQUIRED",{specHash:op.specHash});return op;}
  return this._apply(op);
 }
 async approve(operationId,approvalHash){const op=this.operations.get(operationId);if(!op)throw new Error("OPERATION_NOT_FOUND");if(op.state!==STATES.APPROVAL_REQUIRED)throw new Error("APPROVAL_NOT_REQUIRED");if(approvalHash!==op.specHash)throw new Error("APPROVAL_BINDING_MISMATCH");return this._apply(op);}
 cancel(operationId){const op=this.operations.get(operationId);if(!op)throw new Error("OPERATION_NOT_FOUND");if(terminal(op.state))return op;op.cancelRequested=true;if(op.state===STATES.PLANNING||op.state===STATES.APPROVAL_REQUIRED){op.state=STATES.CANCELLED;this._emit(op,"OPERATION_CANCELLED");}return op;}
 async _apply(op){
  if(op.cancelRequested){op.state=STATES.CANCELLED;this._emit(op,"OPERATION_CANCELLED");return op;}op.state=STATES.EXECUTING;this._emit(op,"OPERATION_EXECUTING");let snapshot;
  try{
   if(this.governor.status().state!=="READY")throw Object.assign(new Error("HOST_NOT_READY"),{code:"HOST_NOT_READY"});
   snapshot=await this.snapshotManager.capture(op.operationId);op.snapshotId=snapshot.id;this._emit(op,"SNAPSHOT_CAPTURED",{snapshotId:snapshot.id,snapshotHash:snapshot.hash});
   const result=await this.hostAdapter.execute(op.spec);if(op.cancelRequested)throw Object.assign(new Error("CANCELLED_DURING_EXECUTION"),{code:"CANCELLED_DURING_EXECUTION"});
   op.state=STATES.VERIFYING;this._emit(op,"OPERATION_VERIFYING");const verified=await this.hostAdapter.verify(op.spec,result,snapshot);
   if(!verified||verified.ok!==true)throw Object.assign(new Error("POSTCONDITION_FAILED"),{code:"POSTCONDITION_FAILED",details:verified});
   op.result=result;op.verification=verified;op.state=STATES.DONE;this._emit(op,"OPERATION_VERIFIED",{snapshotId:snapshot.id,verificationHash:hash(verified)});return op;
  }catch(e){
   op.error={code:e.code||"RUNTIME_ERROR",message:e.message,details:e.details};op.state=e.code==="CANCELLED_DURING_EXECUTION"?STATES.CANCELLED:STATES.UNKNOWN;this._emit(op,"OPERATION_UNRESOLVED",{error:op.error});
   if(snapshot){try{const recovery=await this.recoveryCoordinator.recover({operationId:op.operationId,snapshotId:snapshot.id});op.recovery=recovery;op.state=recovery&&recovery.status==="RESTORED"?STATES.RECOVERY_REQUIRED:STATES.FAILED;this._emit(op,"RECOVERY_COMPLETED",{recovery});}catch(re){op.state=STATES.FAILED;op.recovery={ok:false,error:re.message};this._emit(op,"RECOVERY_FAILED",{error:re.message});}}
   else if(op.state!==STATES.CANCELLED){op.state=STATES.FAILED;this._emit(op,"OPERATION_FAILED");}return op;
  }
 }
 status(operationId){return this.operations.get(operationId)||null;}
}
module.exports={ProductionRuntimeV11,STATES,hash};
