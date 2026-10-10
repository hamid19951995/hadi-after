"use strict";
class CapabilityRegistryV1{
 constructor(registry={}){this.registry=new Map(Object.entries(registry));}
 register(action,spec){if(!action||!spec)throw new Error("CAPABILITY_INVALID");this.registry.set(action,{...spec,action});return this.registry.get(action);}
 assert(action){const x=this.registry.get(action);if(!x)throw Object.assign(new Error("CAPABILITY_MISSING"),{code:"CAPABILITY_MISSING"});if(x.enabled===false)throw Object.assign(new Error("CAPABILITY_DISABLED"),{code:"CAPABILITY_DISABLED"});return x;}
 describe(){return [...this.registry.values()].map(x=>({...x}));}
}
module.exports={CapabilityRegistryV1};
