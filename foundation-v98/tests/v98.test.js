const assert=require('assert');
const {run}=require('../runtime/scenario-runner');assert(run([{name:'x',run:()=>true}],{}).ok);console.log('v98 PASS');
