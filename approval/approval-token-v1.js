"use strict";
const crypto=require("crypto");const {sha256}=require("../kernel/crypto/canonical");
class ApprovalTokenV1{
 constructor({clock=()=>Date.now(),ttlMs=300000}={}){this.clock=clock;this.ttlMs=ttlMs;this.tokens=new Map();}
 issue({operationId,specHash,action,target,approvedBy="user"}){const raw=`${operationId}|${specHash}|${action}|${sha256(target||{})}|${crypto.randomUUID()}`;const token=`aetok_${crypto.createHash("sha256").update(raw).digest("hex")}`;const rec={token,operationId,specHash,action,targetHash:sha256(target||{}),approvedBy,issuedAt:this.clock(),expiresAt:this.clock()+this.ttlMs,status:"ACTIVE"};this.tokens.set(token,rec);return rec;}
 validate(token,{operationId,specHash,action,target}){const r=typeof token==="string"?this.tokens.get(token):token;if(!r||r.status!=="ACTIVE")throw Object.assign(new Error("APPROVAL_TOKEN_INVALID"),{code:"APPROVAL_TOKEN_INVALID"});if(r.expiresAt<=this.clock())throw Object.assign(new Error("APPROVAL_TOKEN_EXPIRED"),{code:"APPROVAL_TOKEN_EXPIRED"});if(r.operationId!==operationId||r.specHash!==specHash||r.action!==action||r.targetHash!==sha256(target||{}))throw Object.assign(new Error("APPROVAL_TOKEN_SCOPE_MISMATCH"),{code:"APPROVAL_TOKEN_SCOPE_MISMATCH"});return true;}
 revoke(token){const r=this.tokens.get(typeof token==="string"?token:token?.token);if(!r)return false;r.status="REVOKED";r.revokedAt=this.clock();return true;}
}
module.exports={ApprovalTokenV1};
