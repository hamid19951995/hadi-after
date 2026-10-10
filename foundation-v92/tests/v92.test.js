const assert=require('assert');
const {resolve}=require('../runtime/compatibility-adapter');assert(resolve({features:['a']},['a']).compatible);console.log('v92 PASS');
