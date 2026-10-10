const {diff}=require('../runtime/differential-simulator'); const assert=require('assert'); assert.equal(diff({a:1,b:2},{a:1,b:3}).length,1); console.log('v123 PASS');
