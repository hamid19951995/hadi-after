"use strict";
class CapabilityGuardV10{
 constructor({capabilities={},denyByDefault=true}={}){this.capabilities=capabilities;this.denyByDefault=denyByDefault;}
 authorize(action,context={}){const cap=this.capabilities[action];if(!cap&&this.denyByDefault)throw Object.assign(new Error("CAPABILITY_DENIED"),{code:"CAPABILITY_DENIED"});if(cap&&cap.enabled===false)throw Object.assign(new Error("CAPABILITY_DISABLED"),{code:"CAPABILITY_DISABLED"});if(cap&&cap.requiresHost&&context.hostReady!==true)throw Object.assign(new Error("HOST_CAPABILITY_REQUIRED"),{code:"HOST_CAPABILITY_REQUIRED"});return {ok:true,action,capability:cap||null};}
}
module.exports={CapabilityGuardV10};
