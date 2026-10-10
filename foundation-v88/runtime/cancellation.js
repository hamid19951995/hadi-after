class CancellationToken{constructor(){this.cancelled=false;this.reason=null} cancel(reason='USER_CANCELLED'){this.cancelled=true;this.reason=reason} throwIfCancelled(){if(this.cancelled){const e=Error(this.reason);e.code='CANCELLED';throw e}}}
class CancellationRegistry{constructor(){this.map=new Map()} token(id){if(!this.map.has(id))this.map.set(id,new CancellationToken());return this.map.get(id)} cancel(id,r){this.token(id).cancel(r)}}
module.exports={CancellationToken,CancellationRegistry};
