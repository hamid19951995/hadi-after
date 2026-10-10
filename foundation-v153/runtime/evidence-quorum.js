'use strict';
function evaluate(evidence,{minSources=2}={}){const good=(evidence||[]).filter(e=>e&&e.valid&&e.digest);const sources=new Set(good.map(e=>e.source));const digests=new Set(good.map(e=>e.digest));return {ok:sources.size>=minSources&&digests.size===1,sources:sources.size,digests:digests.size};}
module.exports={evaluate};
