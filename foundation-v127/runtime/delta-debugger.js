'use strict';
function minimize(items,predicate){let cur=items.slice(),n=2;while(cur.length>=2){let changed=false,chunk=Math.ceil(cur.length/n);for(let i=0;i<cur.length;i+=chunk){const candidate=cur.slice(0,i).concat(cur.slice(i+chunk));if(candidate.length&&predicate(candidate)){cur=candidate;n=Math.max(2,n-1);changed=true;break;}}if(!changed){if(n>=cur.length)break;n=Math.min(cur.length,n*2);}}return cur;}
module.exports={minimize};
