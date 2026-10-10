'use strict';
const cp=require('child_process');
const path=require('path');
const SAFE_BLOCK=[/\bformat\b/i,/\bdiskpart\b/i,/\bshutdown\b/i,/\brestart-computer\b/i,/\bstop-computer\b/i,/\bremove-item\s+.*\s-recurse/i,/\brm\s+-rf\s+[/\\]/i,/\bdel\s+[/\\]/i];
function assertSafe(command,{dangerous=false}={}){if(!dangerous && SAFE_BLOCK.some(r=>r.test(command)))throw new Error('Command blocked by local safety policy');}
class WindowsTerminal{
 constructor({permissions,cwd=process.cwd(),dryRun=true}={}){if(!permissions)throw new Error('permissions required');this.permissions=permissions;this.cwd=cwd;this.dryRun=dryRun;}
 run(command,{shell='powershell',scope='terminal.windows',dangerous=false,timeout=30000,cwd=this.cwd}={}){
  const p=this.permissions.check(scope,'execute'); if(!p.allowed){const e=new Error('Permission denied for '+scope);e.code='PERMISSION_DENIED';throw e;}
  assertSafe(command,{dangerous});
  const request={command,shell,scope,dangerous,timeout,cwd:path.resolve(cwd),dryRun:this.dryRun};
  if(this.dryRun)return {ok:true,dryRun:true,request,stdout:'',stderr:'',exitCode:0};
  const executable=shell==='cmd'?'cmd.exe':'powershell.exe'; const args=shell==='cmd'?['/d','/s','/c',command]:['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-Command',command];
  const out=cp.spawnSync(executable,args,{cwd,encoding:'utf8',timeout,windowsHide:true});
  return {ok:!out.error && out.status===0,dryRun:false,request,stdout:out.stdout||'',stderr:out.stderr||'',exitCode:out.status,error:out.error?out.error.message:null};
 }
}
module.exports={WindowsTerminal,assertSafe};
