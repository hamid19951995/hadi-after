const assert=require('assert');
const {evaluate}=require('../runtime/production-candidate');assert.equal(evaluate({localReady:1,liveEvidence:1,liveCertified:1}),'LIVE_CERTIFIED');console.log('v100 PASS');
