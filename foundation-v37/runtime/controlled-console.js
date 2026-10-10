'use strict';
const crypto=require('crypto');
const SENSITIVE=[/\bremove-item\b/i,/\bdel\b/i,/\bstart-process\b/i,/\breg\s+add\b/i,/\bset-content\b/i];
function risk(command){return SENSITIVE.some(r=>r.test(command))?'SENSITIVE_CONFIRMATION_REQUIRED':'SAFE';}
class ControlledConsole{
 constructor({terminal,permissions,emergencyStop}={}){this.terminal=terminal;this.permissions=permissions;this.emergencyStop=emergencyStop||{active:false};this.history=[];}
 preview(command,options={}){const p=this.permissions.check(options.scope||'terminal.windows','execute');return {id:crypto.createHash('sha256').update(command+'|'+Date.now()).digest('hex').slice(0,16),command,options,risk:risk(command),permission:p,blocked:this.emergencyStop.active||!p.allowed};}
 execute(command,options={},confirmation={confirmed:false}){const p=this.preview(command,options);if(this.emergencyStop.active){const e=new Error('Emergency stop active');e.code='EMERGENCY_STOP';throw e;}if(p.risk==='SENSITIVE_CONFIRMATION_REQUIRED'&&!confirmation.confirmed){const e=new Error('Sensitive confirmation required');e.code='CONFIRMATION_REQUIRED';throw e;}const result=this.terminal.run(command,options);this.history.push({at:new Date().toISOString(),preview:p,result});return result;}
 clear(){this.history=[];}
}
class EmergencyStop{constructor(){this.active=false;}stop(){this.active=true;}resume(){this.active=false;}}
module.exports={ControlledConsole,EmergencyStop,risk};
