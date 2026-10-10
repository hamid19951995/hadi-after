'use strict';
const crypto=require('crypto'); const {validate}=require('../../foundation-v15/manifest/job-manifest'); const {buildPlan}=require('../../foundation-v15/job/job-plan');
const stable=x=>JSON.stringify(x,Object.keys(x||{}).sort()); const hash=x=>crypto.createHash('sha256').update(typeof x==='string'?x:stable(x)).digest('hex');
class AutonomousJobV17{
 constructor(runtime,{checkpoint=null,sleep=ms=>new Promise(r=>setTimeout(r,ms)),onEvent=()=>{}}={}){this.runtime=runtime;this.checkpoint=checkpoint;this.sleep=sleep;this.onEvent=onEvent;}
 async run(input,{dryRun=false,resume=true,signal=null}={}){
  const spec=validate(input),plan=buildPlan(spec),fingerprint=hash(plan),jobId=spec.jobId||hash({fingerprint,output:spec.output});
  if(dryRun)return {status:'PLANNED',jobId,fingerprint,plan,steps:plan.length};
  const prior=resume?this.checkpoint?.load(jobId):null;
  if(prior&&prior.status==='DONE'&&prior.fingerprint===fingerprint)return {...prior,reused:true};
  const completed=new Set(prior?.fingerprint===fingerprint?(prior.completed||[]):[]); const snapshot=prior?.snapshot||spec.snapshot||null;
  const persist=(status,extra={})=>this.checkpoint?.save(jobId,{status,jobId,fingerprint,completed:[...completed],snapshot,...extra});
  try{
   this.onEvent({event:'JOB_STARTED',jobId});persist('RUNNING');
   for(const step of plan){
    if(signal?.aborted)throw new Error('job cancelled'); if(completed.has(step.id))continue;
    let last; let ok=false;
    for(let attempt=1;attempt<=spec.retry.maxAttempts;attempt++){
     try{last=await this.runtime.executePlanStep(step,{attempt,jobId});if(last?.ok===false)throw new Error(last.error||step.type+' failed');ok=true;break;}
     catch(e){last=e;this.onEvent({event:'STEP_RETRY',jobId,stepId:step.id,attempt,error:String(e.message||e)});if(attempt<spec.retry.maxAttempts)await this.sleep(Math.min(2000,150*2**(attempt-1)));}
    }
    if(!ok)throw last; completed.add(step.id);persist('RUNNING');this.onEvent({event:'STEP_CHECKPOINTED',jobId,stepId:step.id});
   }
   if(this.runtime.awaitRender)await this.runtime.awaitRender(); const verified=await this.runtime.verifyOutput(spec.output);
   const result={status:'DONE',jobId,fingerprint,completed:[...completed],output:spec.output,verified};persist('DONE',result);this.onEvent({event:'JOB_DONE',jobId});return result;
  }catch(error){
   const cancelled=/cancelled/i.test(String(error.message||error)); if(snapshot&&!cancelled)try{await this.runtime.restore(snapshot);}catch(e){error.restoreError=String(e);}
   persist(cancelled?'CANCELLED':'FAILED',{error:String(error.message||error)});this.onEvent({event:cancelled?'JOB_CANCELLED':'JOB_FAILED',jobId,error:String(error.message||error)});throw error;
  }
 }
}
module.exports={AutonomousJobV17};
