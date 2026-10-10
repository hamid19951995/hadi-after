"use strict";
const fs=require("fs"),path=require("path"),crypto=require("crypto");
const hash=v=>crypto.createHash("sha256").update(JSON.stringify(v??null)).digest("hex");
class SnapshotManagerV10{
 constructor({dir,provider,restorer}={}){if(!dir||typeof provider!=="function"||typeof restorer!=="function")throw new TypeError("dir, provider and restorer required");this.dir=dir;this.provider=provider;this.restorer=restorer;fs.mkdirSync(dir,{recursive:true});}
 async capture(operationId){const state=await this.provider();const id=operationId+"-"+Date.now()+"-"+crypto.randomBytes(4).toString("hex");const record={id,operationId,createdAt:new Date().toISOString(),state,hash:hash(state)};fs.writeFileSync(path.join(this.dir,id+".json"),JSON.stringify(record,null,2),{flag:"wx"});return record;}
 async restore(id){const p=path.join(this.dir,id+".json");if(!fs.existsSync(p))throw new Error("SNAPSHOT_NOT_FOUND");const record=JSON.parse(fs.readFileSync(p,"utf8"));if(hash(record.state)!==record.hash)throw new Error("SNAPSHOT_TAMPERED");await this.restorer(record.state);return {ok:true,id};}
 inspect(id){const p=path.join(this.dir,id+".json");return fs.existsSync(p)?JSON.parse(fs.readFileSync(p,"utf8")):null;}
}
module.exports={SnapshotManagerV10};
