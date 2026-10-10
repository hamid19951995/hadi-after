function gate(input){const checks=[];function add(name,ok,detail){checks.push({name,ok,detail});}
add('readiness',!!input.readiness&&input.readiness.ready,'production readiness');
add('tests',input.tests==='PASS','regression suite');
add('manifest',!!input.manifestHash,'manifest hash');
add('package',!!input.packageHash,'package hash');
add('liveEvidence',!!input.liveEvidence,'live AE evidence required for release certification');
const failed=checks.filter(c=>!c.ok);return {ok:failed.length===0,checks,failed};}
module.exports={gate};
