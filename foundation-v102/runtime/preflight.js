function preflight(plan, registry, policy){ const issues=[]; for(const op of plan.operations||[]){const v=registry.validate(op);if(!v.ok)issues.push({id:op.id,...v}); else if(policy&&policy(op,v.spec)===false)issues.push({id:op.id,ok:false,reason:'POLICY_BLOCKED'})} return {ok:issues.length===0,issues}; }
module.exports={preflight};
