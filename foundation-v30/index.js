"use strict";
const v28=require("../foundation-v28");
const engine=require("./character-interaction-engine");
function planCharacterInteractionJob(input={}){
 const base=v28.planAdvancedRigJob(input);
 const chars=input.characters||[base.character];
 const interactions=input.interactions||[];
 const interactionPlan=engine.planCharacterInteractions({characters:chars,interactions,fps:input.fps,sceneDuration:base.scene.duration});
 return {...base,characterInteractions:interactionPlan};
}
module.exports={...v28,...engine,planCharacterInteractionJob};
