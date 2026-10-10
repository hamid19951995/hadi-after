'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
class TamperEvidentJournalV20{
 constructor(dir){this.dir=dir;fs.mkdirSync(dir,{recursive:true});}
 file(jobId){return path.join(this.dir,jobId+'.jsonl');}
 append(jobId,event){const f=this.file(jobId);let prev='GENESIS';if(fs.existsSync(f)){const lines=fs.readFileSync(f,'utf8').trim().split('\n').filter(Boolean);if(lines.length)prev=JSON.parse(lines[lines.length-1]).hash;}
  const rec={seq:fs.existsSync(f)?fs.readFileSync(f,'utf8').trim().split('\n').filter(Boolean).length+1:1,ts:new Date().toISOString(),prev,event};rec.hash=hash(JSON.stringify({seq:rec.seq,ts:rec.ts,prev:rec.prev,event:rec.event}));fs.appendFileSync(f,JSON.stringify(rec)+'\n');return rec;}
 verify(jobId){const f=this.file(jobId);if(!fs.existsSync(f))return {ok:true,count:0};let prev='GENESIS',n=0;for(const line of fs.readFileSync(f,'utf8').trim().split('\n').filter(Boolean)){const r=JSON.parse(line),h=hash(JSON.stringify({seq:r.seq,ts:r.ts,prev:r.prev,event:r.event}));if(r.prev!==prev||r.hash!==h)return {ok:false,seq:r.seq};prev=r.hash;n++;}return {ok:true,count:n,head:prev};}
}
module.exports={TamperEvidentJournalV20};
