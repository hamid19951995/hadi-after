const crypto=require('crypto');
function canonical(x){if(Array.isArray(x))return x.map(canonical); if(x&&typeof x==='object')return Object.keys(x).sort().reduce((o,k)=>(o[k]=canonical(x[k]),o),{}); return x;}
function validateResponse(r){const req=['requestId','ok','kind']; const missing=req.filter(k=>!(k in r)); return {ok:missing.length===0 && typeof r.ok==='boolean',missing};}
function fingerprintContract(c){return crypto.createHash('sha256').update(JSON.stringify(canonical(c))).digest('hex');}
module.exports={validateResponse,fingerprintContract,canonical};
