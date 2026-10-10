"use strict";
const crypto=require("crypto");
function opKey(prefix,value){return prefix+":"+crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0,16);}
function planCharacterScene(input){
 if(!input||!Array.isArray(input.characters)||!input.characters.length) throw new Error("SCENE_CHARACTERS_REQUIRED");
 const duration=Number(input.duration)||8;
 const characters=input.characters.map((c,i)=>({
   id:String(c.id||`character-${i+1}`),source:c.source||{mode:"generated-original"},position:c.position||[960,760],facing:c.facing||"right",actions:Array.isArray(c.actions)?c.actions:[]
 }));
 const steps=[];
 for(const c of characters){
   steps.push({id:`bind:${c.id}`,op:"character.bind",operationKey:opKey("character.bind",c),characterId:c.id,position:c.position,facing:c.facing});
   for(let i=0;i<c.actions.length;i++){const a=c.actions[i];steps.push({id:`action:${c.id}:${i+1}`,op:"character.action",operationKey:opKey("character.action",{id:c.id,a,i}),characterId:c.id,action:a.action||a,start:Number(a.start)||0,duration:Number(a.duration)||1});}
 }
 const interactions=Array.isArray(input.interactions)?input.interactions:[];
 for(let i=0;i<interactions.length;i++){const x=interactions[i];steps.push({id:`interaction:${i+1}`,op:"character.interaction",operationKey:opKey("character.interaction",x),...x});}
 return {kind:"character-scene-plan.v1",duration,characters,steps,interactions};
}
function validateScenePlan(plan){
 if(!plan||!Array.isArray(plan.steps)) throw new Error("SCENE_PLAN_REQUIRED");
 const seen=new Set(); for(const s of plan.steps){if(!s.operationKey||seen.has(s.operationKey)) throw new Error("DUPLICATE_OR_MISSING_OPERATION_KEY"); seen.add(s.operationKey);} return true;
}
module.exports={planCharacterScene,validateScenePlan};
