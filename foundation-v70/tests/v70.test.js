const assert=require('assert');const {build,verify}=require('../runtime/release-manifest');assert(verify(build({version:70,files:['b','a'],compatibility:{},tests:['PASS']})));console.log('v70 PASS');
