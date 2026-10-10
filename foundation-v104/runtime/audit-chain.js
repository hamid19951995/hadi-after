const crypto=require('crypto'); const h=x=>crypto.createHash('sha256').update(x).digest('hex');
class AuditChain { constructor(){this.entries=[];this.head='GENESIS'} append(event){const e={seq:this.entries.length+1,event,prev:this.head};e.hash=h(JSON.stringify(e));this.head=e.hash;this.entries.push(Object.freeze(e));return e} verify(){let p='GENESIS';for(const e of this.entries){if(e.prev!==p||e.hash!==h(JSON.stringify({seq:e.seq,event:e.event,prev:e.prev})))return false;p=e.hash}return true}}
module.exports={AuditChain};
