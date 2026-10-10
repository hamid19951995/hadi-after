'use strict';
function run(tasks){const q=tasks.map((x,i)=>({...x,_i:i})).sort((a,b)=>(a.at-b.at)||(a.id||'').localeCompare(b.id||'')||(a._i-b._i));let now=0,out=[];for(const t of q){now=Math.max(now,t.at||0);out.push({id:t.id,time:now,result:typeof t.run==='function'?t.run():t.value});}return out;}
module.exports={run};
