"use strict";
const crypto=require("crypto");
const {sha256,canonicalize}=require("../kernel/crypto/canonical");
const STATES=Object.freeze({QUEUED:"QUEUED",RUNNING:"RUNNING",READBACK:"READBACK",VERIFYING:"VERIFYING",DONE:"DONE",FAILED:"FAILED",UNKNOWN:"UNKNOWN",CANCELLED:"CANCELLED",RECOVERING:"RECOVERING",RECOVERY_REQUIRED:"RECOVERY_REQUIRED"});
const TERMINAL=new Set([STATES.DONE,STATES.FAILED,STATES.UNKNOWN,STATES.CANCELLED,STATES.RECOVERY_REQUIRED]);
function uid(prefix){return `${prefix}-${crypto.randomUUID()}`;}
class ExecutionOrchestratorV6{
 constructor({controller,journal,capabilities,heartbeat,approval,idempotency,clock=()=>Date.now(),maxQueue=100}={}){
  for(const [k,v] of Object.entries({controller,journal,capabilities,heartbeat,approval,idempotency})) if(!v) throw new TypeError(`${k} required`);
  this.controller=controller;this.journal=journal;this.capabilities=capabilities;this.heartbeat=heartbeat;this.approval=approval;this.idempotency=idempotency;this.clock=clock;this.maxQueue=maxQueue;this.queue=[];this.operations=new Map();this.running=false;
 }
 enqueue(input){
  if(!input||!input.action||!input.operationId) throw Object.assign(new Error("INVALID_JOB"),{code:"INVALID_JOB"});
  if(this.queue.length>=this.maxQueue) throw Object.assign(new Error("QUEUE_FULL"),{code:"QUEUE_FULL"});
  const replay=this.idempotency.get(input.idempotencyKey||""); if(replay) return {replay:true,operation:replay};
  if(this.operations.has(input.operationId)) throw Object.assign(new Error("DUPLICATE_OPERATION"),{code:"DUPLICATE_OPERATION"});
  const op={operationId:input.operationId,action:input.action,target:input.target||{},parameters:input.parameters||{},expectedState:input.expectedState,idempotencyKey:input.idempotencyKey||null,state:STATES.QUEUED,createdAt:new Date(this.clock()).toISOString(),attempt:0,events:[]};
  this.operations.set(op.operationId,op);if(op.idempotencyKey)this.idempotency.set(op.idempotencyKey,op);this.queue.push(op);this.record(op,"QUEUED");this.journal.append(op,"QUEUED");return {replay:false,operation:op};
 }
 record(op,event,data={}){const prev=op.events.at(-1);const e={seq:op.events.length+1,event,at:new Date(this.clock()).toISOString(),state:op.state,data,prevHash:prev?prev.hash:"0".repeat(64)};e.hash=sha256(canonicalize(e));op.events.push(e);}
 async next(){if(this.running||!this.queue.length)return null;const op=this.queue.shift();this.running=true;try{return await this.execute(op);}finally{this.running=false;}}
 async execute(op){
  op.attempt++;op.state=STATES.RUNNING;this.record(op,"RUNNING",{attempt:op.attempt});this.journal.append(op,"RUNNING",{attempt:op.attempt});
  try{
   this.heartbeat.assertHealthy();const capability=this.capabilities.assert(op.action);if(capability.mutates===true && op.expectedState===undefined)throw Object.assign(new Error("EXPECTED_STATE_REQUIRED"),{code:"EXPECTED_STATE_REQUIRED"});const plan=this.controller.plan({...op,approvedBy:op.approvedBy||"user"});
   if(!op.approvalToken)op.approvalToken=this.approval.issue({operationId:op.operationId,specHash:plan.specHash,action:op.action,target:op.target,approvedBy:op.approvedBy||"user"});
   this.approval.validate(op.approvalToken,{operationId:op.operationId,specHash:plan.specHash,action:op.action,target:op.target});
   const expectedState=op.expectedState;
   const result=await this.controller.execute(plan,expectedState);
   op.result=result;op.state=result.result?.status==="VERIFIED"?STATES.DONE:result.result?.status==="RECOVERY_REQUIRED"?STATES.RECOVERY_REQUIRED:result.result?.status==="ROLLED_BACK"?STATES.UNKNOWN:STATES.FAILED;
   this.record(op,"COMPLETED",{state:op.state});this.journal.append(op,"COMPLETED",{state:op.state});return op;
  }catch(e){op.error={code:e.code||"EXECUTION_ERROR",message:String(e.message||e)};op.state=String(e.code||"").includes("RECOVER")?STATES.RECOVERY_REQUIRED:STATES.UNKNOWN;this.record(op,"ERROR",op.error);this.journal.append(op,"ERROR",op.error);return op;
  }
 }
 cancel(operationId,reason="cancelled"){const op=this.operations.get(operationId);if(!op||TERMINAL.has(op.state))return false;this.queue=this.queue.filter(x=>x.operationId!==operationId);op.state=STATES.CANCELLED;op.cancelReason=reason;this.record(op,"CANCELLED",{reason});this.journal.append(op,"CANCELLED",{reason});return true;}
 async recover(operationId){const op=this.operations.get(operationId)||this.journal.load(operationId);if(!op)return null;if(op.state===STATES.RUNNING||op.state===STATES.RECOVERING){op.state=STATES.RECOVERING;this.record(op,"RECOVERY_RECONCILE_START");this.journal.append(op,"RECOVERY_RECONCILE_START");if(typeof this.controller.reconcile!=="function"){op.state=STATES.RECOVERY_REQUIRED;this.record(op,"RECOVERY_REQUIRED",{reason:"HOST_RECONCILIATION_UNAVAILABLE"});this.journal.append(op,"RECOVERY_REQUIRED",{reason:"HOST_RECONCILIATION_UNAVAILABLE"});return op;}const reconciliation=await this.controller.reconcile(op);this.record(op,"RECOVERY_RECONCILE_RESULT",reconciliation||{});this.journal.append(op,"RECOVERY_RECONCILE_RESULT",reconciliation||{});if(!reconciliation||reconciliation.safeToRetry!==true){op.state=STATES.RECOVERY_REQUIRED;this.record(op,"RECOVERY_REQUIRED",{reason:"RECONCILIATION_BLOCKED"});this.journal.append(op,"RECOVERY_REQUIRED",{reason:"RECONCILIATION_BLOCKED"});return op;}op.state=STATES.QUEUED;this.queue.unshift(op);this.record(op,"RECOVERY_REQUEUE");this.journal.append(op,"RECOVERY_REQUEUE");return op;}return op;}
 verifyLedger(op){let prev="0".repeat(64);for(let i=0;i<op.events.length;i++){const e=op.events[i],copy={...e};delete copy.hash;if(e.seq!==i+1||e.prevHash!==prev||e.hash!==sha256(canonicalize(copy)))return false;prev=e.hash;}return true;}
}
module.exports={ExecutionOrchestratorV6,STATES,TERMINAL};
