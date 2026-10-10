'use strict';
const crypto=require('crypto');
function canonicalEnv(env,allow){const out={};(allow||[]).slice().sort().forEach(k=>{if(Object.prototype.hasOwnProperty.call(env,k))out[k]=String(env[k]);});return out;}
function fingerprint(env,allow){return crypto.createHash('sha256').update(JSON.stringify(canonicalEnv(env,allow))).digest('hex');}
function compare(a,b,allow){return fingerprint(a,allow)===fingerprint(b,allow);}
module.exports={canonicalEnv,fingerprint,compare};
