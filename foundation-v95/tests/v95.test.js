const assert=require('assert');
const {assess}=require('../runtime/render-monitor');assert(assess({state:'DONE',output:{exists:true,bytes:1}}).complete);console.log('v95 PASS');
