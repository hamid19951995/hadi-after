const STATES=['IDLE','PLANNING','WAITING_PERMISSION','WAITING_CONFIRMATION','EXECUTING','VERIFYING','COMPLETED','FAILED','CANCELLED'];
function transition(current,next){if(STATES.indexOf(current)<0||STATES.indexOf(next)<0)throw new Error('INVALID_STATE');return next;}
function summarize(results){const total=results.length, completed=results.filter(r=>r&&r.ok).length;return {total,completed,percent:total?Math.round(completed*100/total):0,state:completed===total?'COMPLETED':completed?'EXECUTING':'FAILED'};}
module.exports={STATES,transition,summarize};
