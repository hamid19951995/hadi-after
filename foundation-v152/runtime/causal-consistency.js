'use strict';
function verify(events){const seen=new Set();for(const e of events){if(e.id&&seen.has(e.id))return {ok:false,reason:'DUPLICATE_EVENT'};if(Array.isArray(e.dependsOn))for(const d of e.dependsOn)if(!seen.has(d))return {ok:false,reason:'MISSING_CAUSE',cause:d};if(e.id)seen.add(e.id);}return {ok:true};}
module.exports={verify};
