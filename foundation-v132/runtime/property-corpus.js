'use strict';
const {sequence}=require('../../foundation-v131/runtime/deterministic-rng');
function generate(seed,count){return sequence(seed,count,100).map((x,i)=>({id:'case-'+i,value:x}));}
function fingerprint(cases){return require('crypto').createHash('sha256').update(JSON.stringify(cases)).digest('hex');}
module.exports={generate,fingerprint};
