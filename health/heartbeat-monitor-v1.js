"use strict";
class HeartbeatMonitorV1{
 constructor({clock=()=>Date.now(),timeoutMs=10000}={}){this.clock=clock;this.timeoutMs=timeoutMs;this.lastBeat=0;this.status="UNKNOWN";}
 beat(meta={}){this.lastBeat=this.clock();this.status="HEALTHY";this.meta={...meta,at:new Date(this.lastBeat).toISOString()};return this.snapshot();}
 snapshot(){const age=this.lastBeat?this.clock()-this.lastBeat:Infinity;const ok=this.lastBeat>0&&age<=this.timeoutMs;return {ok,status:ok?"HEALTHY":"STALE",ageMs:age,lastBeat:this.lastBeat,meta:this.meta||null};}
 assertHealthy(){const s=this.snapshot();if(!s.ok)throw Object.assign(new Error("HOST_HEARTBEAT_STALE"),{code:"HOST_HEARTBEAT_STALE",health:s});return true;}
}
module.exports={HeartbeatMonitorV1};
