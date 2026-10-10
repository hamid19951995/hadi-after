function score(results){const total=results.length,killed=results.filter(x=>x.killed).length; return {total,killed,survived:total-killed,score:total?killed/total:1};}
module.exports={score};
