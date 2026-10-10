const assert=require('assert');const {batch}=require('../runtime/batch-planner');assert.deepEqual(batch([1,2,3],2),[[1,2],[3]]);console.log('v106 PASS');
