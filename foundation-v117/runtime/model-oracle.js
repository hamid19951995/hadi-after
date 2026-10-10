const {DeterministicAE}=require('../../foundation-v112/runtime/deterministic-ae-simulator');
function run(ops){const ae=new DeterministicAE();const events=[];for(const op of ops){const r=ae.execute(op);events.push({type:op.type,ok:r.ok,error:r.error||null});if(!r.ok)break;}return {events,state:ae.snapshot()};}
function diff(a,b){return JSON.stringify(a)===JSON.stringify(b)?{match:true,diffs:[]}:{match:false,diffs:['STATE_OR_EVENT_MISMATCH']};}
function verify(ops,actual){const expected=run(ops);return {...diff(expected,actual),expected};}
module.exports={run,diff,verify};
