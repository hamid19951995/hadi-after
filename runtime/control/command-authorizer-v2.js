"use strict";
class CommandAuthorizerV2 {
 constructor(registry){this.registry=registry||{};}
 authorize(action,phase){
   const spec=this.registry[action];
   if(!spec) return {allow:false,code:"COMMAND_NOT_REGISTERED"};
   if(phase==="APPLY"&&!spec.mutates) return {allow:false,code:"READ_ONLY_COMMAND_CANNOT_APPLY"};
   if(phase==="READBACK"&&spec.mutates===undefined) return {allow:false,code:"COMMAND_METADATA_INVALID"};
   if(spec.sandbox===true) return {allow:false,code:"SANDBOX_REQUIRED"};
   return {allow:true,risk:spec.risk||"UNKNOWN",requiresApproval:spec.approval===true||spec.mutates===true};
 }
}
module.exports={CommandAuthorizerV2};