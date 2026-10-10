const assert=require('assert');
const {compilePlan}=require('../runtime/ae-operation-compiler');
const {transition,summarize}=require('../runtime/production-status');
const p=compilePlan({operations:[{operationId:'op1',action:'composition.create',parameters:{name:'Pantra 1',width:1920,height:1080,duration:10,frameRate:25}},{operationId:'op2',action:'layer.text.create',parameters:{text:'DATA THEFT',name:'Title'}}]});
assert.equal(p.version,'v40');assert.equal(p.commands[0].command,'createProject');assert.equal(p.commands[1].command,'addTextLayer');assert.ok(p.fingerprint.length===64);
assert.equal(transition('PLANNING','WAITING_CONFIRMATION'),'WAITING_CONFIRMATION');
assert.deepEqual(summarize([{ok:true},{ok:true}]),{total:2,completed:2,percent:100,state:'COMPLETED'});
console.log('AE BOSS Omega Foundation v40 Production Operations tests passed');
