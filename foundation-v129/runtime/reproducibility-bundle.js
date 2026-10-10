'use strict';const crypto=require('crypto');
function stable(v){if(Array.isArray(v))return v.map(stable);if(v&&typeof v==='object'){const o={};Object.keys(v).sort().forEach(k=>o[k]=stable(v[k]));return o;}return v;}
function create(input){const canonical=stable(input);const digest=crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex');return {canonical,digest};}
function verify(bundle){return create(bundle.canonical).digest===bundle.digest;}
module.exports={create,verify};
