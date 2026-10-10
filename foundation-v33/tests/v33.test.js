'use strict'; const assert=require('assert'); const v=require('../');
const plan=v.buildProductionPlan({sceneDuration:10,characters:[{id:'c1'}],props:[{id:'p1'}],actions:[{id:'a1',action:'walk',characterId:'c1',start:0,duration:2}],interactions:[],propActions:[{id:'pA',action:'carry',characterId:'c1',propId:'p1',start:3,duration:2}]});
const r=v.executeProductionPlan(plan,{checkpointEvery:1}); assert.equal(r.ok,true); assert.equal(r.job.state,'COMPLETED'); assert.equal(r.journalValid,true); assert.equal(r.completed.length,2); console.log('v33 Unit Test: PASS');
