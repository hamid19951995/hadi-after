'use strict';
const fs=require('fs'), path=require('path');
class AtomicCheckpointStoreV17{
 constructor(dir='.ae-boss-checkpoints-v17'){this.dir=dir;fs.mkdirSync(dir,{recursive:true});}
 file(id){return path.join(this.dir,encodeURIComponent(id)+'.json');}
 load(id){try{return JSON.parse(fs.readFileSync(this.file(id),'utf8'));}catch(_){return null;}}
 save(id,state){const target=this.file(id),tmp=target+'.'+process.pid+'.tmp';const payload={...state,updatedAt:new Date().toISOString()};fs.writeFileSync(tmp,JSON.stringify(payload,null,2),'utf8');fs.renameSync(tmp,target);return payload;}
 clear(id){try{fs.unlinkSync(this.file(id));return true;}catch(_){return false;}}
}
module.exports={AtomicCheckpointStoreV17};
