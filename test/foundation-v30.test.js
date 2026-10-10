"use strict";
const assert=require("assert");const v=require("../foundation-v30");
const a=v.generateCharacter({id:"alice",style:"modern"});const b=v.generateCharacter({id:"bob",style:"corporate"});
const p=v.planCharacterInteractionJob({text:"interaction",duration:5,fps:30,character:{id:"alice"},characters:[a,b],interactions:[
 {id:"look-1",type:"lookAt",sourceCharacterId:"alice",targetId:"bob",start:0,duration:2},
 {id:"approach-1",type:"approach",sourceCharacterId:"bob",targetId:"alice",start:1,duration:2},
 {id:"gesture-1",type:"gestureSync",sourceCharacterId:"alice",targetId:"bob",start:2,duration:1,data:{action:"point",sync:"target"}}
]});
assert.equal(p.characterInteractions.kind,"character-interaction-plan.v1");assert.equal(p.characterInteractions.interactions.length,3);assert.ok(p.characterInteractions.interactions.every(x=>x.operationKey));assert.equal(v.validateCharacterInteractionPlan(p.characterInteractions),true);console.log("Foundation v30 Character Interaction Engine tests: PASS");
