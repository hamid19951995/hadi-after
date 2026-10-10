"use strict";
const crypto=require("crypto");
const {sha256}=require("../../kernel/crypto/canonical");
const {LeaseManagerV2}=require("./lease-manager-v2");
const {CommandAuthorizerV2}=require("./command-authorizer-v2");
const {EvidenceLedgerV2}=require("./evidence-ledger-v2");
const {TransactionV2}=require("./transaction-v2");

class GovernedControllerV5{
 constructor({registry,host,clock=()=>Date.now(),leaseTtlMs=120000}){
  if(typeof host!=="object"||typeof host.apply!=="function"||typeof host.readback!=="function"||typeof host.snapshot!=="function"||typeof host.rollback!=="function")throw new TypeError("host adapters required");
  this.clock=clock;this.host=host;this.registry=registry||{};this.auth=new CommandAuthorizerV2(this.registry);this.leases=new LeaseManagerV2({clock,maxTtlMs:leaseTtlMs});this.ledger=new EvidenceLedgerV2({clock});
 }
 plan(input){
  if(!input||!input.operationId||!input.action)throw new Error("INVALID_OPERATION");
  const auth=this.auth.authorize(input.action,"APPLY"); if(!auth.allow)throw Object.assign(new Error(auth.code),{code:auth.code});
  const specHash=sha256({action:input.action,target:input.target||{},parameters:input.parameters||{}});
  const approvalHash=sha256({operationId:input.operationId,specHash,approvedBy:input.approvedBy||null});
  const lease=this.leases.issue({operationId:input.operationId,action:input.action,target:input.target||{},ttlMs:input.leaseTtlMs||60000,approvedBy:input.approvedBy||"user"});
  return {operationId:input.operationId,action:input.action,target:input.target||{},parameters:input.parameters||{},specHash,approvalHash,approvedBy:input.approvedBy||"user",lease};
 }
 async execute(plan,expectedState){
  this.leases.validate(plan.lease,plan);
  if(!plan.approvedBy)throw new Error("APPROVAL_REQUIRED");
  const chain=[];this.ledger.append(chain,"PLAN",{operationId:plan.operationId,specHash:plan.specHash});
  this.ledger.append(chain,"LEASE_VALIDATED",{leaseId:plan.lease.leaseId});
  this.ledger.append(chain,"APPLY_START",{action:plan.action});
  const tx=new TransactionV2({snapshot:()=>this.host.snapshot(plan),apply:()=>this.host.apply(plan),readback:()=>this.host.readback(plan),rollback:(before)=>this.host.rollback(before),clock:this.clock});
  const result=await tx.run(plan,expectedState);
  this.ledger.append(chain,result.status==="VERIFIED"?"VERIFY_SUCCESS":"VERIFY_FAILURE",{status:result.status});
  if(result.status==="VERIFIED")this.ledger.append(chain,"DONE",{afterHash:result.afterHash});
  else this.ledger.append(chain,result.status==="ROLLED_BACK"?"ROLLBACK_COMPLETE":"RECOVERY_REQUIRED",{});
  return {plan,result,evidence:chain,complete:result.status==="VERIFIED"&&this.ledger.verify(chain)};
 }
}
module.exports={GovernedControllerV5};