'use strict';
class JobLeaseRegistryV18{
 constructor({now=()=>Date.now()}={}){this.now=now;this.leases=new Map();}
 acquire(jobId,owner,ttlMs=30000){const cur=this.leases.get(jobId),now=this.now();if(cur&&cur.expiresAt>now&&cur.owner!==owner)return null;const lease={jobId,owner,expiresAt:now+ttlMs};this.leases.set(jobId,lease);return lease;}
 renew(jobId,owner,ttlMs=30000){const cur=this.leases.get(jobId),now=this.now();if(!cur||cur.owner!==owner||cur.expiresAt<=now)return null;cur.expiresAt=now+ttlMs;return {...cur};}
 release(jobId,owner){const cur=this.leases.get(jobId);if(!cur||cur.owner!==owner)return false;this.leases.delete(jobId);return true;}
}
module.exports={JobLeaseRegistryV18};
