const path=require('path');
function isWithin(root,target){const r=path.resolve(root),t=path.resolve(target);return t===r||t.startsWith(r+path.sep);}
function authorize(command,ctx){if(!command||!command.type)return {ok:false,reason:'COMMAND_TYPE_REQUIRED'};if(ctx&&ctx.emergencyStop)return {ok:false,reason:'EMERGENCY_STOP'};if(command.path&&ctx&&ctx.workspace&&!isWithin(ctx.workspace,command.path))return {ok:false,reason:'WORKSPACE_ESCAPE'};if(command.shell&&ctx&&!ctx.allowShell)return {ok:false,reason:'SHELL_DISABLED'};return {ok:true};}
function redact(value){return String(value).replace(/(token|secret|password|api[_-]?key)\s*[:=]\s*[^\s,]+/ig,'$1=[REDACTED]');}
module.exports={authorize,isWithin,redact};
