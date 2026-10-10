function select(corpus,profile,{limit=20}={}){return corpus.filter(e=>Object.keys(profile).every(k=>e.environment&&e.environment[k]===profile[k])).slice(0,limit);}
function summary(results){const total=results.length,pass=results.filter(x=>x.status==='PASS').length;return {total,pass,fail:total-pass,passRate:total?pass/total:0};}
module.exports={select,summary};
