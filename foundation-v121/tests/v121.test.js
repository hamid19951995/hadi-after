const a=require('../runtime/bridge-conformance');
const assert=require('assert');
assert.equal(a.validateResponse({requestId:'1',ok:true,kind:'readback'}).ok,true);
assert.equal(a.validateResponse({ok:true}).ok,false);
assert.equal(a.fingerprintContract({b:1,a:2}),a.fingerprintContract({a:2,b:1}));
console.log('v121 PASS');
