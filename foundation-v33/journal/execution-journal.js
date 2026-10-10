'use strict'; const crypto=require('crypto');
function stable(v){ if(v===null||typeof v!=='object') return JSON.stringify(v); if(Array.isArray(v)) return '['+v.map(stable).join(',')+']'; return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}'; }
function digest(v){return crypto.createHash('sha256').update(stable(v)).digest('hex');}
function createJournal(){const entries=[]; let prev=null; return {append(type,payload){const e={seq:entries.length+1,at:Date.now(),type,payload:payload||null,previous:prev}; e.hash=digest(e); prev=e.hash; entries.push(e); return e;},entries,verify(){let p=null; return entries.every(e=>{const copy=Object.assign({},e); const h=copy.hash; delete copy.hash; const ok=e.previous===p&&digest(copy)===h; p=h; return ok;});}};}
module.exports={createJournal};
