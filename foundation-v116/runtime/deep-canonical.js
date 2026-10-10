const crypto=require('crypto');
function normalize(v){
 if(v===null||typeof v!=='object') return v;
 if(Array.isArray(v)) return v.map(normalize);
 const out={}; Object.keys(v).sort().forEach(k=>out[k]=normalize(v[k])); return out;
}
function canonical(v){return JSON.stringify(normalize(v));}
function hash(v){return crypto.createHash('sha256').update(canonical(v)).digest('hex');}
module.exports={normalize,canonical,hash};
