'use strict';
const crypto=require('crypto');
function id(){return crypto.randomUUID?crypto.randomUUID():crypto.randomBytes(16).toString('hex');}
class AutomationOrchestrator{
 constructor({terminal,permissions}={}){this.terminal=terminal;this.permissions=permissions;this.jobs=[];}
 execute(task){const job={id:id(),createdAt:new Date().toISOString(),task,status:'created',steps:[]};this.jobs.push(job);
  const steps=Array.isArray(task.steps)?task.steps:[]; job.status='running';
  try{for(const step of steps){const result=this.terminal.run(step.command,step.options||{});job.steps.push({name:step.name||'terminal',result});if(!result.ok)throw new Error('Step failed: '+(step.name||'terminal'));}job.status='completed';}
  catch(err){job.status='failed';job.error={message:err.message,code:err.code||'EXECUTION_FAILED'};}job.finishedAt=new Date().toISOString();return job;}
 list(){return this.jobs.map(j=>JSON.parse(JSON.stringify(j)));}
}
module.exports={AutomationOrchestrator};
