'use strict'; const {ZeroToRenderRuntime}=require('../../foundation-v14');
class AutonomousProductionRuntime extends ZeroToRenderRuntime {
 async executePlanStep(step,{attempt=1}={}){return this.op({...step.payload,type:step.type,meta:{attempt,stepId:step.id}});}
 async health(){return this.op({type:'runtime.health'});}
 async awaitRender({pollMs=500,maxPolls=720}={}){for(let i=0;i<maxPolls;i++){const r=await this.op({type:'render.status'});if(r&&r.done)return r;if(r&&r.failed)throw new Error(r.error||'render failed');await new Promise(x=>setTimeout(x,pollMs));}throw new Error('render watchdog timeout');}
}
module.exports={AutonomousProductionRuntime};
