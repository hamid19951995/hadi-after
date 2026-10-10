"use strict";
const v27=require("../foundation-v27");
const rig=require("./advanced-rig-engine");
function planAdvancedRigJob(input={}){
  const base=v27.planGeneratedCharacterJob(input);
  const rigPlan=rig.planAdvancedRig({
    character:base.character,
    scene:base.scene,
    profile:input.rigProfile,
    actions:input.rigActions,
    fps:input.fps,
    duration:base.scene.duration
  });
  rig.validateAdvancedRigPlan(rigPlan);
  return {...base,advancedRig:rigPlan};
}
module.exports={...v27,...rig,planAdvancedRigJob};
