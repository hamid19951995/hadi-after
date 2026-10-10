'use strict';
const crypto=require('crypto');
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
class ReconciledTransactionalJobV22{
 constructor({runtime,journal,leaseRegistry,ownerId='runtime-v22',ttlMs=30000}){Object.assign(this,{runtime,journal,leaseRegistry,ownerId,ttlMs});}
 async run(spec,{resume=true}={}){
  const jobId=spec.jobId;if(!jobId)throw new Error('jobId required');
  const integrity=this.journal.verify(jobId);if(!integrity.ok)throw new Error('JOURNAL_TAMPERED');
  let prior=this.journal.state(jobId),specHash=hash(spec);
  if(prior.specHash&&prior.specHash!==specHash)throw new Error('JOB_SPEC_MISMATCH');
  if(prior.status==='DONE')return {status:'DONE',jobId,reused:true,completed:prior.completed};
  const lease=this.leaseRegistry.acquire(jobId,this.ownerId,this.ttlMs);if(!lease)throw new Error('LEASE_CONFLICT');
  const token=lease.token,completed=new Set(resume?prior.completed:[]);
  try{
   this.journal.append(jobId,{type:prior.status==='NEW'?'JOB_INTENT':'JOB_RESUME',token,specHash,completed:[...completed]});
   for(const step of spec.steps||[]){
    if(completed.has(step.id))continue;
    if(!this.leaseRegistry.renew(jobId,this.ownerId,token,this.ttlMs)||!this.leaseRegistry.assert(jobId,this.ownerId,token))throw new Error('LEASE_LOST');
    const operationKey=crypto.createHash('sha256').update(jobId+'\0'+specHash+'\0'+step.id).digest('hex');
    if(prior.uncertain.includes(step.id)&&this.runtime.reconcileStep){
      const probe=await this.runtime.reconcileStep(step,{jobId,operationKey,fencingToken:token});
      if(probe&&probe.applied){this.journal.append(jobId,{type:'STEP_RECONCILE_COMMIT',step:step.id,token,operationKey,result:probe.result||null});this.journal.append(jobId,{type:'STEP_COMMIT',step:step.id,token,operationKey,reconciled:true,result:probe.result||null});completed.add(step.id);continue;}
      this.journal.append(jobId,{type:'STEP_RECONCILE_RETRY',step:step.id,token,operationKey});
    }
    this.journal.append(jobId,{type:'STEP_PREPARE',step:step.id,token,operationKey});
    const result=await this.runtime.executePlanStep(step,{jobId,operationKey,fencingToken:token,recovery:prior.status!=='NEW'});
    if(result?.ok===false)throw new Error(result.error||'STEP_FAILED');
    if(!this.leaseRegistry.assert(jobId,this.ownerId,token))throw new Error('FENCED');
    this.journal.append(jobId,{type:'STEP_COMMIT',step:step.id,token,operationKey,result:result||null});completed.add(step.id);prior=this.journal.state(jobId);
   }
   if(this.runtime.awaitRender)await this.runtime.awaitRender();
   const verified=this.runtime.verifyOutput?await this.runtime.verifyOutput(spec.output):true;if(verified===false)throw new Error('OUTPUT_VERIFICATION_FAILED');
   this.journal.append(jobId,{type:'JOB_COMMIT',token,verified});return {status:'DONE',jobId,completed:[...completed],token,verified};
  }catch(err){this.journal.append(jobId,{type:'JOB_ABORT',token,error:String(err.message||err),recoverable:true});throw err;}
  finally{this.leaseRegistry.release(jobId,this.ownerId,token);}
 }
}
module.exports={ReconciledTransactionalJobV22};
