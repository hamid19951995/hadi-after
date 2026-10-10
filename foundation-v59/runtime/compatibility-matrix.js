const crypto=require('crypto');
function key(e){return [e.aeVersion||'',e.osFamily||'',e.cepVersion||''].join('|')}
function buildMatrix(evidence){const rows={};for(const e of evidence||[]){const k=key(e);const pass=e.result==='PASS';const r=rows[k]||(rows[k]={environment:k,total:0,pass:0,fail:0,operations:{}});r.total++;pass?r.pass++:r.fail++;for(const o of e.operations||[]){const x=r.operations[o.id]||(r.operations[o.id]={pass:0,fail:0});o.result==='PASS'?x.pass++:x.fail++}}return Object.values(rows).map(r=>({...r,health:r.fail?'UNSTABLE':r.pass?'CERTIFIED_CANDIDATE':'UNKNOWN'}))}
function fingerprint(matrix){return crypto.createHash('sha256').update(JSON.stringify(matrix)).digest('hex')}
module.exports={buildMatrix,fingerprint};
