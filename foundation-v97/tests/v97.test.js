const assert=require('assert');
const {summarize}=require('../runtime/performance-profiler');assert.equal(summarize([1,2,3]).count,3);console.log('v97 PASS');
