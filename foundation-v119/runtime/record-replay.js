const {hash}=require('../../foundation-v116/runtime/deep-canonical');
function record(ops,executor){const events=[];for(const op of ops){const result=executor(op);events.push({op,result});if(!result||result.ok===false)break;}return {events,hash:hash(events)};}
function replay(recording,executor){const actual=record(recording.events.map(e=>e.op),executor);return {match:actual.hash===recording.hash,expected:recording.hash,actual:actual.hash,recording:actual};}
module.exports={record,replay};
