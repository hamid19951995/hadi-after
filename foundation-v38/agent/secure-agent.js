'use strict';
class SecureAgent{
 constructor({workspace,permissions,console}={}){this.workspace=workspace;this.permissions=permissions;this.console=console;}
 buildPlan(task){const steps=(task.steps||[]).map((s,i)=>({id:s.id||`step-${i+1}`,name:s.name||'terminal',command:s.command||'',options:s.options||{},workspace:s.workspace||'workspace'}));return {taskId:task.id||null,steps};}
 execute(task,{autoConfirm=false}={}){const plan=this.buildPlan(task),events=[];for(const step of plan.steps){const preview=this.console.preview(step.command,step.options);events.push({type:'preview',stepId:step.id,preview});if(preview.risk==='SENSITIVE_CONFIRMATION_REQUIRED'&&!autoConfirm){return {status:'WAITING_CONFIRMATION',plan,events};}const r=this.console.execute(step.command,step.options,{confirmed:autoConfirm});events.push({type:'result',stepId:step.id,result:r});if(!r.ok)return {status:'FAILED',plan,events};}return {status:'VERIFIED',plan,events};}
}
module.exports={SecureAgent};
