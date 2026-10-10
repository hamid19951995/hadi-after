const assert=require('assert');
const {snapshot,restore}=require('../runtime/project-safety');const s=snapshot({a:1});assert.equal(restore(s).a,1);console.log('v96 PASS');
