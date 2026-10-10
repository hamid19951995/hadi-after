"use strict";
const fs=require("fs"),path=require("path");const {sha256}=require("../../kernel/crypto/canonical");
class PersistentIdempotencyStoreV4{
 constructor({file=".aeboss/idempotency-v4.json",clock=()=>Date.now()}={}){this.file=file;this.clock=clock;this.map=new Map();this.load();}
 load(){if(!fs.existsSync(this.file))return;const raw=JSON.parse(fs.readFileSync(this.file,"utf8"));if(raw.schemaVersion!=="4.0.0"||raw.checksum!==sha256(raw.data||{}))throw new Error("IDEMPOTENCY_STORE_INTEGRITY_ERROR");for(const [k,v] of Object.entries(raw.data||{}))this.map.set(k,v);}
 flush(){fs.mkdirSync(path.dirname(this.file),{recursive:true});const data=Object.fromEntries(this.map);const out={schemaVersion:"4.0.0",updatedAt:new Date(this.clock()).toISOString(),data};out.checksum=sha256(data);const tmp=this.file+".tmp";fs.writeFileSync(tmp,JSON.stringify(out,null,2),"utf8");fs.renameSync(tmp,this.file);}
 get(key){return key?this.map.get(key)||null:null;}
 claim(key,record){if(!key)return null;const prior=this.map.get(key);if(prior){if(prior.fingerprint!==record.fingerprint)throw Object.assign(new Error("IDEMPOTENCY_KEY_REUSE"),{code:"IDEMPOTENCY_KEY_REUSE",operationId:prior.operationId});return prior;}this.map.set(key,{...record,claimedAt:this.clock()});this.flush();return null;}
 update(key,patch){if(!this.map.has(key))return false;this.map.set(key,{...this.map.get(key),...patch,updatedAt:this.clock()});this.flush();return true;}
 clear(key){const ok=this.map.delete(key);if(ok)this.flush();return ok;}
 size(){return this.map.size;}
}
module.exports={PersistentIdempotencyStoreV4};
