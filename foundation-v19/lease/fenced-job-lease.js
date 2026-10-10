'use strict';
// Fencing tokens prevent a stale runtime from committing after a lease is lost/reacquired.
class FencedJobLeaseRegistryV19 {
 constructor({now=()=>Date.now()}={}){this.now=now;this.leases=new Map();this.counters=new Map();}
 acquire(jobId,owner,ttlMs=30000){const now=this.now(),cur=this.leases.get(jobId);if(cur&&cur.expiresAt>now&&cur.owner!==owner)return null;const token=(this.counters.get(jobId)||0)+1;this.counters.set(jobId,token);const lease={jobId,owner,token,expiresAt:now+ttlMs};this.leases.set(jobId,lease);return {...lease};}
 renew(jobId,owner,token,ttlMs=30000){const cur=this.leases.get(jobId),now=this.now();if(!cur||cur.owner!==owner||cur.token!==token||cur.expiresAt<=now)return null;cur.expiresAt=now+ttlMs;return {...cur};}
 assert(jobId,owner,token){const cur=this.leases.get(jobId),now=this.now();return !!(cur&&cur.owner===owner&&cur.token===token&&cur.expiresAt>now);}
 release(jobId,owner,token){const cur=this.leases.get(jobId);if(!cur||cur.owner!==owner||cur.token!==token)return false;this.leases.delete(jobId);return true;}
}
module.exports={FencedJobLeaseRegistryV19};
