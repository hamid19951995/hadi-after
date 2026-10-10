function run(steps,ctx){const out=[];for(const s of steps){const r=s.run(ctx);out.push({name:s.name,ok:!!r});if(!r)return {ok:false,out}}return {ok:true,out}}module.exports={run};
