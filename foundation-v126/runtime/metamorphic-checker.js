'use strict';
const crypto=require('crypto');
function canon(v){if(Array.isArray(v))return v.map(canon);if(v&&typeof v==='object'){const o={};Object.keys(v).sort().forEach(k=>o[k]=canon(v[k]));return o;}return v;}
function hash(v){return crypto.createHash('sha256').update(JSON.stringify(canon(v))).digest('hex');}
function check(run,input,transforms){const base=run(input);const rows=transforms.map(t=>{const x=t.transform(input);const got=run(x);return {name:t.name,pass:!!t.relation(base,got),baseHash:hash(base),gotHash:hash(got)};});return {pass:rows.every(r=>r.pass),rows};}
module.exports={check,hash,canon};
