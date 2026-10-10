'use strict'; const assert=require('assert'); const v=require('..');
const p=v.buildProductionPlan({sceneDuration:10,characters:[{id:'c1'}],props:[{id:'p1'}],actions:[{id:'a1',action:'walk',characterId:'c1',start:0,duration:1},{id:'a2',action:'run',characterId:'c1',start:2,duration:1}],interactions:[],propActions:[]});
const b=v.runProductionBatch([p,p]); assert.equal(b.ok,true); assert.equal(b.completed,2); const r=v.executeProductionPlan(p); const rep=v.buildExecutionReport(r); assert.equal(rep.ok,true); assert.equal(rep.journalValid,true); console.log('v34 Unit Test: PASS');
