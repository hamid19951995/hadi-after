"use strict";
const assert=require("assert");
const v=require("../foundation-v31");
const alice=v.generateCharacter({id:"alice",style:"modern"});
const bob=v.generateCharacter({id:"bob",style:"corporate"});
const prop=v.normalizeProp({id:"presentation-board",type:"document",name:"Presentation Board",position:{x:320,y:180},grabbable:true,interactable:true,affordances:["carry","present","place"],initialHolderCharacterId:null});
assert.equal(prop.kind,"intelligent-prop.v1");
const direct=v.planCharacterPropIntelligence({characters:[alice,bob],props:[prop],fps:30,sceneDuration:6,actions:[
 {id:"pick",action:"pickUp",sourceCharacterId:"alice",propId:"presentation-board",start:0,duration:.5},
 {id:"carry",action:"carry",sourceCharacterId:"alice",propId:"presentation-board",start:.5,duration:2},
 {id:"handoff",action:"handoff",sourceCharacterId:"alice",targetCharacterId:"bob",propId:"presentation-board",start:2.5,duration:.75},
 {id:"use",action:"use",sourceCharacterId:"bob",propId:"presentation-board",start:3.25,duration:1},
 {id:"place",action:"place",sourceCharacterId:"bob",propId:"presentation-board",start:4.25,duration:.75,targetPosition:{x:540,y:280}}
]});
assert.equal(direct.kind,"character-prop-intelligence-plan.v1");
assert.equal(direct.actions.length,5);
assert.equal(direct.actions[0].stateBefore,"world");
assert.equal(direct.actions[0].stateAfter,"held");
assert.equal(direct.actions[0].holderAfter,"alice");
assert.equal(direct.actions[2].targetCharacterId,"bob");
assert.equal(direct.stateModel.finalStates["presentation-board"],"placed");
assert.equal(direct.stateModel.finalHolders["presentation-board"],null);
assert.ok(direct.actions.every(x=>x.operationKey&&x.compiledKey));
assert.equal(v.validateCharacterPropPlan(direct),true);
const wrapped=v.planCharacterPropJob({text:"present",duration:6,fps:30,character:{id:"alice",style:"modern"},characters:[alice,bob],props:[prop],propActions:direct.actions.map(x=>({id:x.id,action:x.action,sourceCharacterId:x.sourceCharacterId,targetCharacterId:x.targetCharacterId,propId:x.propId,start:x.start,duration:x.duration,targetPosition:x.targetPosition}))});
assert.ok(wrapped.characterInteractions);
assert.ok(wrapped.characterPropIntelligence);
const inferred=v.inferPropActions({text:"لطفاً این وسیله را بردار و ببر",characterId:"alice",propId:"presentation-board",start:0,duration:1});
assert.equal(inferred[0].action,"pickUp");
let bad=false; try{v.planCharacterPropIntelligence({characters:[alice],props:[prop],actions:[{action:"handoff",sourceCharacterId:"alice",propId:prop.spec.id,start:0,duration:1}]});}catch(e){bad=true;} assert.equal(bad,true);
console.log("Foundation v31 Character + Prop Intelligence tests: PASS");
