const assert=require('assert');const {minimize}=require('../runtime/delta-debugger');const out=minimize(['a','x','b','c'],x=>x.includes('x'));assert.deepEqual(out,['x']);console.log('v127 PASS');
