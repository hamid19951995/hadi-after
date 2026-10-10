 "use strict";
const crypto=require("crypto");
const {sha256,canonicalize}=require("../kernel/crypto/canonical");
const {AdmissionPolicyV7}=require("../runtime/control/admission-policy-v7");

const STATES=Object.freeze({
  QUEUED:"QUEUED", PLANNING:"PLANNING", APPROVAL_REQUIRED:"APPROVAL_REQUIRED",
  RUNNING:"RUNNING", READBACK:"READBACK", VERIFYING:"VERIFYING", DONE:"DONE",
  FAILED:"FAILED", UNKNOWN:"UNKNOWN", CANCELLED:"CANCELLED", RECOVERING:"RECOVERING",
  RECOVERY_REQUIRED:"RECOVERY_REQUIRED"
});
const TERMINAL=new Set([STATES.DONE,STATES.FAILED,STATES.UNKNOWN,STATES.CANCELLED,STATES.RECOVERY_REQUIRED]);

function uid(prefix){return `${prefix}-${crypto.randomUUID()}`;}
function err(code,message=code){return Object.assign(new Error(message),{code});}

class ExecutionOrchestratorV7{
 constructor({controller,journal,capabilities,heartbeat,approval,idempotency,clock=()=>Date.now(),maxQueue=100,requireApproval=true,admissionPolicy=new AdmissionPolicyV7()}={}){
  for(const [k,v] of Object.entries({controller,journal,capabilities,heartbeat,approval,idempotency}))
    if(!v) throw new TypeError(`${k} required`);
  this.controller=controller;this.journal=journal;this.capabilities=capabilities;
  this.heartbeat=heartbeat;this.approval=approval;this.idempotency=idempotency;
  this.clock=clock;this.maxQueue=maxQueue;this.requireApproval=requireApproval;
  this.admissionPolicy=admissionPolicy;this.queue=[];this.operations=new Map();this.running=false;
 }
 _record(op,event,data={}){
  const prev=op.events.at(-1);
  const e={seq:op.events.length+1,event,at:new Date(this.clock()).toISOString(),state:op.state,data,
    prevHash:prev?prev.hash:"0".repeat(64)};
  e.hash=sha256(canonicalize(e));op.events.push(e);
  this.journal.append(op,event,data);return e;
 }
 enqueue(input){
  if(!input||!input.action||!input.operationId)throw err("INVALID_JOB");
  if(this.queue.length>=this.maxQueue)throw err("QUEUE_FULL");
  const key=input.idempotencyKey||null;
  const replay=key?this.idempotency.get(key):null;
  if(replay)return {replay:true,operation:replay};
  if(this.operations.has(input.operationId))throw err("DUPLICATE_OPERATION");
  const cap=this.capabilities.assert(input.action);this.admissionPolicy.admit(cap);
  const op={operationId:input.operationId,action:input.action,target:input.target||{},
    parameters:input.parameters||{},expectedState:input.expectedState,idempotencyKey:key,
    approvedBy:input.approvedBy||null,approvalToken:input.approvalToken||null,
    state:STATES.QUEUED,createdAt:new Date(this.clock()).toISOString(),attempt:0,events:[],
    plan:null,result:null,error:null};
  if(cap.mutates===true && input.expectedState===undefined)throw err("EXPECTED_STATE_REQUIRED");
  this.operations.set(op.operationId,op);if(key)this.idempotency.set(key,op);
  this.queue.push(op);this._record(op,"QUEUED");return {replay:false,operation:op};
 }
 async plan(operationId,approvedBy=null){
  const op=this.operations.get(operationId);if(!op)throw err("OPERATION_NOT_FOUND");
  if(TERMINAL.has(op.state))throw err("OPERATION_TERMINAL");
  this.heartbeat.assertHealthy();const cap=this.capabilities.assert(op.action);this.admissionPolicy.admit(cap);
  op.state=STATES.PLANNING;this._record(op,"PLANNING");
  op.plan=this.controller.plan({...op,approvedBy:approvedBy||op.approvedBy||null});
  if(this.requireApproval && !op.approvalToken){
    op.state=STATES.APPROVAL_REQUIRED;this._record(op,"APPROVAL_REQUIRED",{specHash:op.plan.specHash});
    return op;
  }
  return op;
 }
 approve(operationId,approvedBy="user"){
  const op=this.operations.get(operationId);if(!op||!op.plan)throw err("PLAN_REQUIRED");
  if(TERMINAL.has(op.state))throw err("OPERATION_TERMINAL");
  if(op.state!==STATES.APPROVAL_REQUIRED && op.state!==STATES.PLANNING)
    throw err("APPROVAL_NOT_EXPECTED");
  op.approvedBy=approvedBy;
  op.approvalToken=this.approval.issue({
    operationId:op.operationId,specHash:op.plan.specHash,action:op.action,target:op.target,approvedBy
  });
  op.state=STATES.QUEUED;this._record(op,"APPROVED",{approvedBy,specHash:op.plan.specHash});
  if(!this.queue.includes(op))this.queue.unshift(op);
  return op;
 }
 async next(){
  if(this.running||!this.queue.length)return null;
  const op=this.queue.shift();this.running=true;
  try{return await this.execute(op);}finally{this.running=false;}
 }
 async execute(op){
  if(!op.plan)await this.plan(op.operationId,op.approvedBy);
  if(op.state===STATES.APPROVAL_REQUIRED)return op;
  if(this.requireApproval&&!op.approvalToken)throw err("APPROVAL_REQUIRED");
  op.attempt++;op.state=STATES.RUNNING;this._record(op,"RUNNING",{attempt:op.attempt});
  try{
    this.heartbeat.assertHealthy();
    const cap=this.capabilities.assert(op.action);this.admissionPolicy.admit(cap);
    if(!op.plan)throw err("PLAN_REQUIRED");
    if(this.requireApproval){
      this.approval.validate(op.approvalToken,{operationId:op.operationId,specHash:op.plan.specHash,action:op.action,target:op.target});
    }
    const result=await this.controller.execute(op.plan,op.expectedState);
    op.result=result;
    const status=result?.result?.status;
    if(status==="VERIFIED")op.state=STATES.DONE;
    else if(status==="RECOVERY_REQUIRED")op.state=STATES.RECOVERY_REQUIRED;
    else if(status==="ROLLED_BACK")op.state=STATES.UNKNOWN;
    else op.state=STATES.FAILED;
    this._record(op,"COMPLETED",{state:op.state});
    return op;
  }catch(e){
    op.error={code:e.code||"EXECUTION_ERROR",message:String(e.message||e)};
    op.state=String(e.code||"").includes("RECOVER")?STATES.RECOVERY_REQUIRED:STATES.UNKNOWN;
    this._record(op,"ERROR",op.error);return op;
  }
 }
 cancel(operationId,reason="cancelled"){
  const op=this.operations.get(operationId);if(!op||TERMINAL.has(op.state))return false;
  this.queue=this.queue.filter(x=>x.operationId!==operationId);op.state=STATES.CANCELLED;
  op.cancelReason=reason;this._record(op,"CANCELLED",{reason});return true;
 }
 async recover(operationId){
  const op=this.operations.get(operationId)||this.journal.load(operationId);if(!op)return null;
  if(op.state===STATES.RUNNING||op.state===STATES.RECOVERING){
    op.state=STATES.RECOVERING;this._record(op,"RECOVERY_RECONCILE_START");
    if(typeof this.controller.reconcile!=="function"){
      op.state=STATES.RECOVERY_REQUIRED;this._record(op,"RECOVERY_REQUIRED",{reason:"HOST_RECONCILIATION_UNAVAILABLE"});return op;
    }
    const reconciliation=await this.controller.reconcile(op);this._record(op,"RECOVERY_RECONCILE_RESULT",reconciliation||{});
    if(!reconciliation||reconciliation.safeToRetry!==true){
      op.state=STATES.RECOVERY_REQUIRED;this._record(op,"RECOVERY_REQUIRED",{reason:"RECONCILIATION_BLOCKED"});return op;
    }
    op.state=STATES.QUEUED;this.queue.unshift(op);this._record(op,"RECOVERY_REQUEUE");return op;
  }
  return op;
 }
 verifyLedger(op){
  let prev="0".repeat(64);
  for(let i=0;i<op.events.length;i++){
    const e=op.events[i],copy={...e};delete copy.hash;
    if(e.seq!==i+1||e.prevHash!==prev||e.hash!==sha256(canonicalize(copy)))return false;
    prev=e.hash;
  }return true;
 }
}
module.exports={ExecutionOrchestratorV7,STATES,TERMINAL};
