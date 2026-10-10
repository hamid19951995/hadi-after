"use strict";
const rigSchema={version:"original-2d-puppet-v1",controllers:{root:{type:"position"},head:{type:"rotation"},body:{type:"rotation"},leftArm:{type:"rotation"},rightArm:{type:"rotation"},leftLeg:{type:"rotation"},rightLeg:{type:"rotation"}},reconciliation:{strategy:"controller-keyframe-signature",fields:["characterId","action","start","duration"]}};
function validateRigPlan(plan){if(!plan||!Array.isArray(plan.steps))throw new Error("RIG_PLAN_REQUIRED"); for(const s of plan.steps){if(!s.action||s.duration<=0)throw new Error("INVALID_RIG_STEP");} return true;}
module.exports={rigSchema,validateRigPlan};
