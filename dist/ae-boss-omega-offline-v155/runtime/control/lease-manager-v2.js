"use strict";
const crypto=require("crypto");
const {canonicalize,sha256}=require("../../kernel/crypto/canonical");

function randomId(prefix){return prefix+"-"+crypto.randomUUID();}
class LeaseManagerV2 {
  constructor({clock=()=>Date.now(),maxTtlMs=120000}={}){this.clock=clock;this.maxTtlMs=maxTtlMs;this.leases=new Map();}
  issue({operationId,action,target,ttlMs=60000,approvedBy="user"}){
    if(!operationId||!action) throw new Error("LEASE_INPUT_INVALID");
    ttlMs=Math.min(Math.max(1,Number(ttlMs)||0),this.maxTtlMs);
    const scopeHash=sha256({action,target:target||{}});
    const lease={leaseId:randomId("lease"),operationId,scopeHash,issuedAt:new Date(this.clock()).toISOString(),expiresAt:new Date(this.clock()+ttlMs).toISOString(),approvedBy,status:"ACTIVE"};
    this.leases.set(lease.leaseId,lease); return Object.freeze({...lease});
  }
  revoke(leaseId){const l=this.leases.get(leaseId);if(!l)return false;l.status="REVOKED";l.revokedAt=new Date(this.clock()).toISOString();return true;}
  validate(lease,{operationId,action,target}){
    if(!lease||!lease.leaseId) throw new Error("LEASE_REQUIRED");
    const stored=this.leases.get(lease.leaseId);
    if(!stored||stored.status!=="ACTIVE") throw new Error("LEASE_REVOKED_OR_UNKNOWN");
    if(stored.operationId!==operationId) throw new Error("LEASE_OPERATION_MISMATCH");
    if(stored.expiresAt && Date.parse(stored.expiresAt)<=this.clock()) throw new Error("LEASE_EXPIRED");
    const expected=sha256({action,target:target||{}});
    if(stored.scopeHash!==expected||lease.scopeHash!==expected) throw new Error("LEASE_SCOPE_MISMATCH");
    return true;
  }
}
module.exports={LeaseManagerV2};