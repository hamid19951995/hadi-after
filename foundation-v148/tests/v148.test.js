const assert=require('assert');const {equivalent}=require('../runtime/replay-equivalence');const r=equivalent(s=>s.reduce((n,x)=>n+x,0),[1,2,3]);assert(r.equivalent);console.log('v148 PASS');
