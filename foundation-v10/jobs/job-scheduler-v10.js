"use strict";
const crypto=require("crypto");
class JobSchedulerV10{
 constructor({concurrency=1,executor}={}){if(typeof executor!=="function")throw new TypeError("executor required");this.concurrency=concurrency;this.executor=executor;this.queue=[];this.running=0;this.jobs=new Map();}
 submit(spec){const id=spec.jobId||crypto.randomUUID();if(this.jobs.has(id))return this.jobs.get(id);const job={jobId:id,status:"QUEUED",spec};this.jobs.set(id,job);this.queue.push(job);this._pump();return job;}
 _pump(){while(this.running<this.concurrency&&this.queue.length){const job=this.queue.shift();this.running++;job.status="RUNNING";Promise.resolve().then(()=>this.executor(job.spec)).then(r=>{job.status="DONE";job.result=r;},e=>{job.status="FAILED";job.error={message:e.message,code:e.code||"JOB_FAILED"};}).finally(()=>{this.running--;this._pump();});}}
 get(id){return this.jobs.get(id)||null;}
}
module.exports={JobSchedulerV10};
