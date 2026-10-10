"use strict";
const fs=require("fs"),path=require("path");
const {sha256,canonicalize}=require("../kernel/crypto/canonical");

class PersistentIdempotencyStoreV3{
 constructor({file=".aeboss/idempotency.json",clock=()=>Date.now()}={}){
  this.file=file;this.clock=clock;this.map=new Map();this.load();
 }
 load(){
  if(!fs.existsSync(this.file))return;
  const raw=JSON.parse(fs.readFileSync(this.file,"utf8"));
  if(raw.schemaVersion!=="3.0.0"||raw.checksum!==sha256(raw.data||{}))throw new Error("IDEMPOTENCY_STORE_INTEGRITY_ERROR");
  for(const [k,v] of Object.entries(raw.data||{}))this.map.set(k,v);
 }
 flush(){
  fs.mkdirSync(path.dirname(this.file),{recursive:true});
  const data=Object.fromEntries(this.map);
  const out={schemaVersion:"3.0.0",updatedAt:new Date(this.clock()).toISOString(),data};
  out.checksum=sha256(out.data);
  const tmp=this.file+".tmp";
  fs.writeFileSync(tmp,JSON.stringify(out,null,2),"utf8");
  fs.renameSync(tmp,this.file);
 }
 get(key){return key?this.map.get(key)||null:null;}
 set(key,value){if(!key)return value;this.map.set(key,value);this.flush();return value;}
 has(key){return !!this.get(key);}
 clear(key){const ok=this.map.delete(key);if(ok)this.flush();return ok;}
 size(){return this.map.size;}
}
module.exports={PersistentIdempotencyStoreV3};
