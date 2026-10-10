const assert=require('assert');const {gate}=require('../runtime/live-compatibility-gate');
const profile={require:{afterEffectsMajor:26,osFamily:'Windows'}};
const ok={host:{},environment:{afterEffectsMajor:26,osFamily:'Windows'},operations:[{id:'createComp',status:'PASS',readback:{name:'Test'}}]};
let r=gate(profile,ok);assert.equal(r.status,'CERTIFIABLE');assert.equal(r.validation.valid,true);assert.ok(r.evidenceHash.length===64);
const bad={...ok,environment:{afterEffectsMajor:25,osFamily:'Windows'}};r=gate(profile,bad);assert.equal(r.status,'BLOCKED');assert.equal(r.compatibility.compatible,false);
const noRead={...ok,operations:[{id:'x',status:'PASS'}]};r=gate(profile,noRead);assert.equal(r.status,'BLOCKED');console.log('v58 compatibility gate: PASS');
