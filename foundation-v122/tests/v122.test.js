const {minimize}=require('../runtime/transcript-minimizer'); const assert=require('assert'); const r=minimize(['a','x','b'],x=>x.includes('x')); assert.deepEqual(r,['x']); console.log('v122 PASS');
