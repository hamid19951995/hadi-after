const crypto=require('crypto');
function canon(x){return JSON.stringify(x,Object.keys(x).sort());}
function hash(x){return crypto.createHash('sha256').update(canon(x)).digest('hex');}
function diff(expected,actual,p=''){const out=[]; const keys=[...new Set([...Object.keys(expected||{}),...Object.keys(actual||{})])].sort(); for(const k of keys){const a=expected&&expected[k],b=actual&&actual[k],q=p?`${p}.${k}`:k;if(a&&b&&typeof a==='object'&&typeof b==='object'&&!Array.isArray(a)&&!Array.isArray(b))out.push(...diff(a,b,q));else if(JSON.stringify(a)!==JSON.stringify(b))out.push({path:q,expected:a,actual:b});}return out;}
function detect(expected,actual){const changes=diff(expected,actual);return {expectedHash:hash(expected),actualHash:hash(actual),drifted:changes.length>0,changes};}
module.exports={detect};
