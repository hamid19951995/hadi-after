'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const canonical=v=>JSON.stringify(v);
const digest=v=>crypto.createHash('sha256').update(canonical(v)).digest('hex');
class TransactionalJournalV21{
 constructor(dir){this.dir=dir;fs.mkdirSync(dir,{recursive:true});}
 file(jobId){return path.join(this.dir,encodeURIComponent(jobId)+'.jsonl');}
 read(jobId){const f=this.file(jobId);if(!fs.existsSync(f))return [];return fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(x=>JSON.parse(x));}
 append(jobId,event){const rows=this.read(jobId),prev=rows.length?rows[rows.length-1].hash:'GENESIS';const rec={seq:rows.length+1,ts:new Date().toISOString(),prev,event};rec.hash=digest({seq:rec.seq,ts:rec.ts,prev:rec.prev,event:rec.event});fs.appendFileSync(this.file(jobId),JSON.stringify(rec)+'\n');return rec;}
 verify(jobId){let prev='GENESIS',seq=1;for(const r of this.read(jobId)){if(r.seq!==seq||r.prev!==prev||r.hash!==digest({seq:r.seq,ts:r.ts,prev:r.prev,event:r.event}))return {ok:false,seq:r.seq};prev=r.hash;seq++;}return {ok:true,count:seq-1,head:prev};}
 state(jobId){const rows=this.read(jobId),s={status:'NEW',completed:[],pending:null,token:null};for(const r of rows){const e=r.event||{};if(e.type==='JOB_INTENT')s.status='RUNNING';if(e.type==='STEP_INTENT')s.pending=e.step;if(e.type==='STEP_COMMIT'){if(!s.completed.includes(e.step))s.completed.push(e.step);if(s.pending===e.step)s.pending=null;}if(e.type==='JOB_COMMIT')s.status='DONE';if(e.type==='JOB_ABORT'){s.status='FAILED';s.pending=null;}if(e.token!=null)s.token=e.token;}return s;}
}
module.exports={TransactionalJournalV21};
