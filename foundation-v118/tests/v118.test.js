const assert=require('assert');const {campaign}=require('../runtime/invariant-campaign');const r=campaign([1,2,3,4,5],30);assert.equal(r.passed,5);console.log('v118 PASS');
