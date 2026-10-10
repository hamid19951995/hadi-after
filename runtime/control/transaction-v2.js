"use strict";
const crypto=require("crypto");
const {sha256}=require("../../kernel/crypto/canonical");
class TransactionV2{
 constructor({snapshot,apply,readback,rollback,clock=()=>Date.now()}){
  for(const [k,v] of Object.entries({snapshot,apply,readback,rollback}))if(typeof v!=="function")throw new TypeError(k+" required");
  Object.assign(this,{snapshot,apply,readback,rollback,clock});
 }
 async run(operation,expectedState){
  const tx={transactionId:"tx-"+crypto.randomUUID(),operationId:operation.operationId,status:"OPEN",startedAt:new Date(this.clock()).toISOString()};
  tx.before=await this.snapshot();tx.beforeHash=sha256(tx.before);
  try{
   tx.applyResult=await this.apply(operation);tx.status="APPLIED";
   tx.after=await this.readback(operation);tx.afterHash=sha256(tx.after);
   tx.expectedHash=sha256(expectedState);
   tx.verified=tx.afterHash===tx.expectedHash;
   if(tx.verified){tx.status="VERIFIED";return tx;}
   tx.status="MISMATCH";
   tx.rollbackResult=await this.rollback(tx.before);tx.status="ROLLED_BACK";
   tx.postRollback=await this.readback(operation);tx.postRollbackHash=sha256(tx.postRollback);
   tx.rollbackVerified=tx.postRollbackHash===tx.beforeHash;
   if(!tx.rollbackVerified)tx.status="RECOVERY_REQUIRED";
   return tx;
  }catch(error){
   tx.error={code:error.code||"TRANSACTION_ERROR",message:String(error.message||error)};
   try{tx.rollbackResult=await this.rollback(tx.before);tx.status="ROLLED_BACK";}catch(rb){tx.rollbackError=String(rb.message||rb);tx.status="RECOVERY_REQUIRED";}
   return tx;
  }
 }
}
module.exports={TransactionV2};