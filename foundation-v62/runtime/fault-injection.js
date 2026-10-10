function inject(plan,rule){const p=JSON.parse(JSON.stringify(plan));p.operations=(p.operations||[]).map(o=>({...o,__fault:(rule&&rule.operationId===o.id)?rule:null}));return p}
function execute(plan,executor){const out=[];for(const o of plan.operations||[]){if(o.__fault){out.push({id:o.id,result:'FAIL',injected:true,kind:o.__fault.kind||'FAIL'});break}try{out.push({id:o.id,result:'PASS',value:executor(o)})}catch(e){out.push({id:o.id,result:'FAIL',error:String(e.message||e)});break}}return {result:out.some(x=>x.result==='FAIL')?'FAIL':'PASS',operations:out}}
module.exports={inject,execute};
