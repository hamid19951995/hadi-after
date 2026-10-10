'use strict';
const {ProductionRuntimeV16}=require('../../foundation-v16/runtime/production-runtime');
class ProductionRuntimeV17 extends ProductionRuntimeV16{
 constructor(opts={}){super(opts);this.active=new Map();this.events=[];this.metricsV17={failed:0,cancelled:0};}
 emit(event,data={}){this.events.push({event,at:new Date().toISOString(),...data});if(this.events.length>500)this.events.shift();}
 async executePlanStep(step,ctx={}){const {jobId,attempt=1}=ctx;this.active.set(jobId,{stepId:step.id,attempt,startedAt:Date.now()});this.emit('STEP_STARTED',{jobId,stepId:step.id,attempt});try{const out=await super.executePlanStep(step,ctx);this.emit('STEP_DONE',{jobId,stepId:step.id,attempt});return out;}catch(e){this.metricsV17.failed++;this.emit('STEP_FAILED',{jobId,stepId:step.id,error:String(e.message||e)});throw e;}finally{this.active.delete(jobId);}}
 cancel(jobId){const r=super.cancel(jobId);this.metricsV17.cancelled++;this.emit('JOB_CANCELLED',{jobId});return r;}
 getEvents(){return this.events.slice();}
 status(){return {...super.status(),...this.metricsV17,active:[...this.active.entries()]};}
}
module.exports={ProductionRuntimeV17};
