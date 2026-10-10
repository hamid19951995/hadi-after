'use strict';const crypto=require('crypto');
function canonical(x){if(Array.isArray(x))return x.map(canonical);if(x&&typeof x==='object'){const o={};Object.keys(x).sort().forEach(k=>o[k]=canonical(x[k]));return o;}return x;}
function hash(x){return crypto.createHash('sha256').update(JSON.stringify(canonical(x))).digest('hex');}
function build(events){let prev='0'.repeat(64);return events.map((event,index)=>{const entry={index,event:canonical(event),prev};const digest=hash(entry);prev=digest;return {...entry,digest};});}
function verify(log){let prev='0'.repeat(64);for(let i=0;i<log.length;i++){const {index,event,digest}=log[i]||{};if(index!==i||!digest||hash({index,event,prev})!==digest)return false;prev=digest;}return true;}
module.exports={build,verify};
