'use strict';
const STATES=['CREATED','QUEUED','VALIDATED','RUNNING','CHECKPOINTED','COMPLETED','FAILED','CANCELLED'];
const ALLOWED={CREATED:['QUEUED','VALIDATED','CANCELLED'],QUEUED:['VALIDATED','CANCELLED'],VALIDATED:['RUNNING','CANCELLED'],RUNNING:['CHECKPOINTED','COMPLETED','FAILED','CANCELLED'],CHECKPOINTED:['RUNNING','FAILED','CANCELLED'],COMPLETED:[],FAILED:['QUEUED','CANCELLED'],CANCELLED:[]};
function transition(job,to,meta){ if(!STATES.includes(to)) throw new Error('INVALID_JOB_STATE'); if(!ALLOWED[job.state].includes(to)) throw new Error('INVALID_JOB_TRANSITION'); job.state=to; job.updatedAt=Date.now(); job.history.push({state:to,at:job.updatedAt,meta:meta||null}); return job; }
function createJob(plan){ return {id:'job-'+plan.fingerprint.slice(0,16),fingerprint:plan.fingerprint,state:'CREATED',createdAt:Date.now(),updatedAt:Date.now(),history:[{state:'CREATED',at:Date.now()}]}; }
module.exports={STATES,createJob,transition};
