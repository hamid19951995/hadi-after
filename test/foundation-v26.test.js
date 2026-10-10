"use strict";
const assert=require("assert"); const v=require("../foundation-v26");
const raw={projectName:"Farmer Reference",items:[
 {id:1,name:"Farmer Rig",type:"CompItem",width:1920,height:1080,duration:8,frameRate:30,layers:[
  {index:1,name:"ROOT CONTROL",type:"AVLayer",parent:"",enabled:true,hasExpressions:false,controls:["Size"]},
  {index:2,name:"Head",type:"AVLayer",parent:"ROOT CONTROL",enabled:true,hasExpressions:false,controls:[]},
  {index:3,name:"Body",type:"AVLayer",parent:"ROOT CONTROL",enabled:true,hasExpressions:false,controls:[]},
  {index:4,name:"Left Arm",type:"AVLayer",parent:"Body",enabled:true,hasExpressions:true,controls:[]}
 ]},
 {id:2,name:"Walk Action",type:"CompItem",width:1920,height:1080,duration:2,frameRate:30,layers:[]}
]};
const model=v.normalizeInspection(raw); assert.equal(model.kind,"ae-project-inspection.v1"); assert.ok(model.fingerprint.length===64);
const intel=v.analyzeCharacterProject(raw); assert.equal(intel.kind,"character-project-intelligence.v1"); assert.equal(intel.primaryRigCandidate.comp,"Farmer Rig"); assert.ok(intel.actionCompositions.includes("Walk Action"));
const scene=v.planCharacterScene({duration:5,characters:[{id:"a",actions:[{action:"walk",start:0,duration:2}]},{id:"b",actions:[{action:"wave",start:2,duration:1}]}],interactions:[{type:"greeting",from:"a",to:"b",start:2}]}); v.validateScenePlan(scene); assert.equal(scene.characters.length,2); assert.equal(new Set(scene.steps.map(s=>s.operationKey)).size,scene.steps.length);
const p=v.planReferenceGuidedCharacterJob({text:"یک شخصیت راه برود و دست تکان دهد",duration:5}); assert.equal(p.actionLibrary.copyAssets,false); assert.ok(p.scene.steps.length>1);
const ref=v.createReferenceSession({path:"/mnt/data/07 - Farmer.aep"}); assert.equal(ref.readOnly,true); assert.equal(ref.copyAssets,false);
console.log("Foundation v26 character project intelligence tests: PASS");
