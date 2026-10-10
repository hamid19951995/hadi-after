'use strict'; const fs=require('fs'); const path=require('path');
class FileCheckpointStore{constructor(dir='.ae-boss-checkpoints'){this.dir=dir;fs.mkdirSync(dir,{recursive:true});}file(id){return path.join(this.dir,id+'.json');}load(id){try{return JSON.parse(fs.readFileSync(this.file(id),'utf8'));}catch(_){return null;}}save(id,state){const f=this.file(id),t=f+'.tmp';fs.writeFileSync(t,JSON.stringify({...state,updatedAt:new Date().toISOString()},null,2));fs.renameSync(t,f);return state;}}
module.exports={FileCheckpointStore};
