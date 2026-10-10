const assert=require('assert');const {check}=require('../runtime/metamorphic-checker');
const run=x=>({sum:x.values.reduce((a,b)=>a+b,0)});const r=check(run,{values:[1,2,3]},[{name:'permute',transform:x=>({values:[3,1,2]}),relation:(a,b)=>a.sum===b.sum}]);assert(r.pass);console.log('v126 PASS');
