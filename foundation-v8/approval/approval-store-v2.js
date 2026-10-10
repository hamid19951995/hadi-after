"use strict";
const fs=require("fs"),path=require("path"),crypto=require("crypto");
const {sha256,canonicalize}=require("../../kernel/crypto/canonical");
class ApprovalStoreV2{
 constructor({file=".aeboss/approval-store-v2.json",clock=()=>Date.now(),ttlMs=300000,secret=null}={}){this.file=file;this.clock=clock;this.ttlMs=ttlMs;this.map=new Map();this.secret=secret||this._loadOrCreateSecret();this.load();}
 _loadOrCreateSecret(){const sf=this.file+".secret";try{return fs.readFileSync(sf,"utf8").trim();}catch{};fs.mkdirSync(path.dirname(this.file),{recursive:true});const s=crypto.randomBytes(32).toString("hex");fs.writeFileSync(sf,s,{encoding:"utf8"});return s;}
 _sig(claims){return crypto.createHmac("sha256",this.secret).update(canonicalize(claims)).digest("hex");}
 load(){if(!fs.existsSync(this.file))return;const raw=JSON.parse(fs.readFileSync(this.file,"utf8"));if(raw.schemaVersion!=="2.0.0"||raw.checksum!==sha256(raw.data||{}))throw new Error("APPROVAL_STORE_INTEGRITY_ERROR");for(const [k,v] of Object.entries(raw.data||{}))this.map.set(k,v);}
 flush(){fs.mkdirSync(path.dirname(this.file),{recursive:true});const data=Object.fromEntries(this.map);const out={schemaVersion:"2.0.0",updatedAt:new Date(this.clock()).toISOString(),data};out.checksum=sha256(data);const tmp=this.file+".tmp";fs.writeFileSync(tmp,JSON.stringify(out,null,2),"utf8");fs.renameSync(tmp,this.file);}
 issue({operationId,specHash,action,target,approvedBy="user",ttlMs=this.ttlMs}){const claims={operationId,specHash,action,targetHash:sha256(target||{}),approvedBy,issuedAt:this.clock(),expiresAt:this.clock()+ttlMs,nonce:crypto.randomUUID()};const token="aev2_"+claims.nonce+"."+this._sig(claims);const rec={token,...claims,status:"ACTIVE"};this.map.set(token,rec);this.flush();return rec;}
 validate(token,scope){const r=typeof token==="string"?this.map.get(token):token;if(!r||r.status!=="ACTIVE")throw Object.assign(new Error("APPROVAL_TOKEN_INVALID"),{code:"APPROVAL_TOKEN_INVALID"});if(r.expiresAt<=this.clock())throw Object.assign(new Error("APPROVAL_TOKEN_EXPIRED"),{code:"APPROVAL_TOKEN_EXPIRED"});const {token:_,status:__,...claims}=r;const rawToken=r.token;if(this._sig(claims)!==rawToken.split(".").at(-1))throw Object.assign(new Error("APPROVAL_TOKEN_TAMPERED"),{code:"APPROVAL_TOKEN_TAMPERED"});if(r.operationId!==scope.operationId||r.specHash!==scope.specHash||r.action!==scope.action||r.targetHash!==sha256(scope.target||{}))throw Object.assign(new Error("APPROVAL_TOKEN_SCOPE_MISMATCH"),{code:"APPROVAL_TOKEN_SCOPE_MISMATCH"});return true;}
 revoke(token){const r=this.map.get(typeof token==="string"?token:token?.token);if(!r)return false;r.status="REVOKED";r.revokedAt=this.clock();this.flush();return true;}
}
module.exports={ApprovalStoreV2};
