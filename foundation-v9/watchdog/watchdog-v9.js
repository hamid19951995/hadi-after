"use strict";
class WatchdogV9{
 constructor({governor,clock=()=>Date.now(),maxSilenceMs=10000}={}){this.governor=governor;this.clock=clock;this.maxSilenceMs=maxSilenceMs;this.timer=null;}
 check(){const s=this.governor.status();if(!s.sessionId)return {ok:false,code:"HOST_OFFLINE"};const age=this.clock()-s.lastHeartbeat;if(age>this.maxSilenceMs){this.governor.state="UNKNOWN";return {ok:false,code:"HOST_HEARTBEAT_STALE",ageMs:age};}return {ok:true,ageMs:age,state:s.state};}
 start(intervalMs=Math.max(250,Math.floor(this.maxSilenceMs/2))){this.stop();this.timer=setInterval(()=>this.check(),intervalMs);return this;}
 stop(){if(this.timer)clearInterval(this.timer);this.timer=null;}
}
module.exports={WatchdogV9};
