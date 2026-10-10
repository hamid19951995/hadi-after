const assert=require('assert');const {compare}=require('../runtime/semantic-diff');assert(compare({b:2,a:1},{a:1,b:2}).equal);console.log('v66 PASS');
