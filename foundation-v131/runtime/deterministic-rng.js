'use strict';
function makeRng(seed){let s=(Number(seed)>>>0)||1;return function(){s=(1664525*s+1013904223)>>>0;return s/4294967296;};}
function sequence(seed,n,max){const r=makeRng(seed);const out=[];for(let i=0;i<n;i++)out.push(Math.floor(r()*max));return out;}
module.exports={makeRng,sequence};
