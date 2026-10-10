"use strict";
const v25=require("../foundation-v25");
const project=require("./project-model"); const intel=require("./character-project-intelligence"); const rig=require("./rig-intelligence"); const library=require("./action-library-builder"); const reference=require("./reference-session");
function planReferenceGuidedCharacterJob(input){
 const characterPlan=v25.planCharacterJob(input||{});
 const scene=rig.planCharacterScene({duration:characterPlan.sequence.duration,characters:[{id:(input&&input.characterId)||"character-1",source:characterPlan.manifest.character.source,actions:characterPlan.sequence.steps.map(s=>({action:s.action,start:s.start,duration:s.duration}))}],interactions:(input&&input.interactions)||[]});
 rig.validateScenePlan(scene);
 return {...characterPlan,scene,actionLibrary:library.buildActionLibrary({actions:characterPlan.intent.actions})};
}
module.exports={...v25,...project,...intel,...rig,...library,...reference,planReferenceGuidedCharacterJob};
