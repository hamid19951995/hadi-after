'use strict';const crypto=require('crypto');function digest(x){return crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');}
function equivalent(run,steps){const a=run(steps);const b=run(JSON.parse(JSON.stringify(steps)));return {equivalent:digest(a)===digest(b),expected:a,actual:b};}module.exports={equivalent};
