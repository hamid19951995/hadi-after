const assert=require('assert');const {resolve}=require('../runtime/feature-flags');assert(resolve({x:{when:[{key:'ae',equals:26}]}},{ae:26}).x);console.log('v67 PASS');
