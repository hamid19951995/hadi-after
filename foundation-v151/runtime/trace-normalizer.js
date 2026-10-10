'use strict';
const crypto=require('crypto');
function canonical(v){if(Array.isArray(v))return v.map(canonical);if(v&&typeof v==='object'){const o={};Object.keys(v).sort().forEach(k=>{if(!['timestamp','wallClock','pid'].includes(k))o[k]=canonical(v[k]);});return o;}return v;}
function normalize(events){return events.map((e,i)=>Object.assign({seq:i+1},canonical(e)));}
function digest(events){return crypto.createHash('sha256').update(JSON.stringify(normalize(events))).digest('hex');}
module.exports={normalize,digest};
