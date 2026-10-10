'use strict';
const fs = require('fs');
const path = require('path');
function createCheckpoint(root, jobId, state){ fs.mkdirSync(root,{recursive:true}); const payload={schema:'checkpoint.v1',jobId,createdAt:new Date().toISOString(),state}; const file=path.join(root,jobId+'.json'); fs.writeFileSync(file,JSON.stringify(payload,null,2)); return {ok:true,file,payload}; }
function restoreCheckpoint(root, jobId){ const file=path.join(root,jobId+'.json'); if(!fs.existsSync(file)) return {ok:false,error:'CHECKPOINT_NOT_FOUND'}; return {ok:true,payload:JSON.parse(fs.readFileSync(file,'utf8'))}; }
module.exports={createCheckpoint,restoreCheckpoint};
