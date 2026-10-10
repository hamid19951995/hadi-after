const assert=require('assert');
const {run}=require('../runtime/live-host-test-harness');const r=run({PING:o=>({ok:true,readback:o.id})},[{id:'a',type:'PING'}]);assert(r.pass);console.log('v91 PASS');
