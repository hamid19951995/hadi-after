"use strict";
const {normalizeAction}=require("./character-catalog");
const defaults={idle:1,walk:2,talk:2,point:1.5,wave:1.2,think:1.5,celebrate:1.5,present:2,enter:1.2,exit:1.2};
function sequence(input){
 const actions=(input.actions||[]).map(a=>normalizeAction(a)||a).filter(Boolean); if(!actions.length) throw new Error("CHARACTER_ACTION_REQUIRED");
 const requested=Number(input.duration)||0; const base=actions.reduce((n,a)=>n+(defaults[a]||1.5),0); const scale=requested>0?requested/base:1;
 let time=0; const steps=actions.map((action,index)=>{const duration=Number(((defaults[action]||1.5)*scale).toFixed(3)); const step={id:`char-step-${index+1}`,operationKey:`character:${input.character||"ae-boss-puppet-v1"}:${index}:${action}`,action,start:Number(time.toFixed(3)),duration}; time+=duration; return step;});
 return {version:"character-sequence.v1",character:input.character||"ae-boss-puppet-v1",duration:Number(time.toFixed(3)),steps};
}
module.exports={sequence,defaults};
