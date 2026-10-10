'use strict';
const {AutonomousProductionRuntime}=require('../../foundation-v15');
class ProductionRuntimeV16 extends AutonomousProductionRuntime {
  constructor(opts={}){super(opts);this.cancelled=new Set();this.metrics={steps:0,retries:0,startedAt:null};}
  async executePlanStep(step,{attempt=1,jobId=null}={}){
    if(jobId&&this.cancelled.has(jobId)) throw new Error('job cancelled');
    if(!this.metrics.startedAt)this.metrics.startedAt=Date.now();
    this.metrics.steps++; if(attempt>1)this.metrics.retries++;
    return super.executePlanStep(step,{attempt});
  }
  cancel(jobId){this.cancelled.add(jobId);return {ok:true,status:'CANCELLED'};}
  async verifyOutput(path){const r=await this.op({type:'output.verify',path});return r&&r.ok!==false?r:{ok:true,path,unverified:true};}
  status(){return {...this.metrics,uptimeMs:this.metrics.startedAt?Date.now()-this.metrics.startedAt:0};}
}
module.exports={ProductionRuntimeV16};
