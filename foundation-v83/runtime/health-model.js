function score({bridge=true,heartbeatAgeMs=0,maxHeartbeatAgeMs=5000,queueDepth=0,maxQueueDepth=100}){let s=100;if(!bridge)s-=50;s-=Math.min(30,30*heartbeatAgeMs/maxHeartbeatAgeMs);s-=Math.min(20,20*queueDepth/maxQueueDepth);s=Math.max(0,Math.round(s));return {score:s,status:s>=80?'HEALTHY':s>=50?'DEGRADED':'UNHEALTHY'};}
module.exports={score};
