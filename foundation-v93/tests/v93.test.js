const assert=require('assert');
const {correlate,retry}=require('../runtime/bridge-reliability');assert(correlate({id:1},{id:1,ok:true}));assert.equal(retry(()=>1,2),1);console.log('v93 PASS');
