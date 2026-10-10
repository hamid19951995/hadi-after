const assert=require('assert');const {profile}=require('../runtime/environment-profile');assert.equal(profile({ae:'26',os:'win'}).fingerprint.length,64);console.log('v108 PASS');
