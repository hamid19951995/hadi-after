const crypto=require('crypto');
function canonical(v){if(Array.isArray(v))return v.map(canonical);if(v&&typeof v==='object'){const o={};Object.keys(v).sort().forEach(k=>o[k]=canonical(v[k]));return o;}return v;}
function snapshot(state){const canonicalState=canonical(state);const json=JSON.stringify(canonicalState);return {state:canonicalState,json,fingerprint:crypto.createHash('sha256').update(json).digest('hex')};}
function compare(a,b){const x=snapshot(a),y=snapshot(b);return {equal:x.fingerprint===y.fingerprint,left:x.fingerprint,right:y.fingerprint};}
module.exports={snapshot,compare};
