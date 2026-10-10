const assert=require('assert');const {campaign}=require('../runtime/deterministic-chaos-campaign');const r=campaign(s=>({ok:s%2===0}),[1,2,3,4]);assert.equal(r.passed,2);console.log('v114 PASS');
