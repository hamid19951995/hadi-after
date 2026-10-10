'use strict'; const assert=require('assert'); const v35=require('..');
const plan={fingerprint:'fp-v35',actions:[{id:'a2',action:'move',start:2,duration:1},{id:'a1',action:'walk',start:0,duration:1}],interactions:[],propActions:[]};
let r=v35.executeGovernedProductionPlan(plan,{checkpointEvery:1,policy:{maxOperations:5,maxTimeline:10}}); assert(r.ok); assert.equal(r.completed.length,2); assert(r.metrics.journalValid);
r=v35.executeGovernedProductionPlan(plan,{policy:{maxOperations:1}}); assert(!r.ok); assert.equal(r.error,'POLICY_MAX_OPERATIONS_EXCEEDED');
const s=v35.superviseProductionPlans([plan,{...plan,fingerprint:'fp2'}],{policy:{maxOperations:5},stopOnFailure:false}); assert(s.ok&&s.completed===2);
console.log('v35 PASS');
