const {score}=require('../runtime/mutation-score'); const assert=require('assert'); const r=score([{killed:true},{killed:false}]); assert.equal(r.score,.5); console.log('v124 PASS');
