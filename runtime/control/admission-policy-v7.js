"use strict";
class AdmissionPolicyV7{
 constructor({maxRisk="HIGH",allowSandbox=false}={}){this.maxRisk=maxRisk;this.allowSandbox=allowSandbox;}
 admit(spec){
  if(!spec)throw Object.assign(new Error("CAPABILITY_MISSING"),{code:"CAPABILITY_MISSING"});
  if(spec.enabled===false)throw Object.assign(new Error("CAPABILITY_DISABLED"),{code:"CAPABILITY_DISABLED"});
  if(spec.sandbox===true&&!this.allowSandbox)throw Object.assign(new Error("SANDBOX_REQUIRED"),{code:"SANDBOX_REQUIRED"});
  const order={LOW:1,MEDIUM:2,HIGH:3,CRITICAL:4,UNKNOWN:99};
  if((order[spec.risk||"UNKNOWN"]||99)>(order[this.maxRisk]||3))
    throw Object.assign(new Error("RISK_LIMIT_EXCEEDED"),{code:"RISK_LIMIT_EXCEEDED",risk:spec.risk});
  return true;
 }
}
module.exports={AdmissionPolicyV7};
