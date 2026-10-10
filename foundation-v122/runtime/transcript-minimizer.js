function minimize(events,predicate){let out=events.slice(), changed=true; while(changed){changed=false; for(let i=0;i<out.length;i++){const c=out.slice(0,i).concat(out.slice(i+1)); if(predicate(c)){out=c;changed=true;break;}}} return out;}
module.exports={minimize};
