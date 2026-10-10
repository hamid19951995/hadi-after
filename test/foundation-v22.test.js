'use strict';const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path');
const {ReconciledJournalV22,ReconciledTransactionalJobV22}=require('../foundation-v22');const {FencedJobLeaseRegistryV19}=require('../foundation-v19');
(async()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ae-v22-'));const journal=new ReconciledJournalV22(dir),lease=new FencedJobLeaseRegistryV19();let crash=true,calls=0,reconciles=0;
 const runtime={executePlanStep:async s=>{calls++;if(s.id==='b'&&crash){crash=false;throw new Error('crash after external effect');}return {ok:true};},reconcileStep:async s=>{reconciles++;return s.id==='b'?{applied:true,result:{ok:true,source:'probe'}}:{applied:false};},verifyOutput:async()=>true};
 const job=new ReconciledTransactionalJobV22({runtime,journal,leaseRegistry:lease,ownerId:'A'}),spec={jobId:'j22',steps:[{id:'a'},{id:'b'}],output:'x'};
 await assert.rejects(()=>job.run(spec)); const st=journal.state('j22');assert.deepEqual(st.completed,['a']);assert.deepEqual(st.uncertain,['b']);
 const r=await job.run(spec);assert.equal(r.status,'DONE');assert.equal(calls,2);assert.equal(reconciles,1);assert.equal(journal.verify('j22').ok,true);
 await assert.rejects(()=>job.run({...spec,output:'changed'}),/JOB_SPEC_MISMATCH/);console.log('foundation v22: PASS');
})().catch(e=>{console.error(e);process.exit(1)});
