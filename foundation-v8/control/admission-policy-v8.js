"use strict";
const path=require("path");
class AdmissionPolicyV8{
 constructor({maxRisk="HIGH",allowSandbox=false,allowedActions=null,denyActions=[],maxParametersBytes=256*1024}={}){this.maxRisk=maxRisk;this.allowSandbox=allowSandbox;this.allowedActions=allowedActions?new Set(allowedActions):null;this.denyActions=new Set(denyActions);this.maxParametersBytes=maxParametersBytes;}
 admit(spec){if(!spec)throw this.e("CAPABILITY_MISSING");if(spec.enabled===false)throw this.e("CAPABILITY_DISABLED");if(this.allowedActions&&!this.allowedActions.has(spec.action))throw this.e("ACTION_NOT_ALLOWLISTED");if(this.denyActions.has(spec.action))throw this.e("ACTION_DENIED");if(spec.sandbox===true&&!this.allowSandbox)throw this.e("SANDBOX_REQUIRED");const order={LOW:1,MEDIUM:2,HIGH:3,CRITICAL:4,UNKNOWN:99};if((order[spec.risk||"UNKNOWN"]||99)>(order[this.maxRisk]||3))throw Object.assign(this.e("RISK_LIMIT_EXCEEDED"),{risk:spec.risk});return true;}
 validateParameters(parameters){let bytes=Buffer.byteLength(JSON.stringify(parameters||{}),"utf8");if(bytes>this.maxParametersBytes)throw Object.assign(this.e("PARAMETERS_TOO_LARGE"),{bytes,max:this.maxParametersBytes});return true;}
 e(code){return Object.assign(new Error(code),{code});}
}
module.exports={AdmissionPolicyV8};
