'use strict'; const fs=require('fs'),path=require('path');
class JournaledCheckpointStoreV19 {
 constructor(dir='.ae-boss-checkpoints-v19'){this.dir=dir;fs.mkdirSync(dir,{recursive:true});}
 file(id){return path.join(this.dir,encodeURIComponent(id)+'.json');} journal(id){return this.file(id)+'.journal';}
 load(id){try{return JSON.parse(fs.readFileSync(this.file(id),'utf8'));}catch(_){return null;}}
 save(id,state){const payload={...state,version:19,updatedAt:new Date().toISOString()};const j=this.journal(id),f=this.file(id),tmp=f+'.'+process.pid+'.tmp';fs.appendFileSync(j,JSON.stringify({at:payload.updatedAt,status:payload.status,completed:payload.completed?.length||0})+'\n');fs.writeFileSync(tmp,JSON.stringify(payload,null,2));fs.renameSync(tmp,f);return payload;}
 clear(id){for(const f of [this.file(id),this.journal(id)])try{fs.unlinkSync(f);}catch(_){}return true;}
}
module.exports={JournaledCheckpointStoreV19};
