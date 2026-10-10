class CircuitBreaker {
  constructor({failureThreshold=3, resetMs=30000, now=()=>Date.now()}={}) { this.failureThreshold=failureThreshold; this.resetMs=resetMs; this.now=now; this.state='CLOSED'; this.failures=0; this.openedAt=0; }
  allow(){ if(this.state==='OPEN'){ if(this.now()-this.openedAt>=this.resetMs){ this.state='HALF_OPEN'; return true;} return false;} return true; }
  success(){ this.failures=0; this.state='CLOSED'; }
  failure(){ this.failures++; if(this.state==='HALF_OPEN'||this.failures>=this.failureThreshold){this.state='OPEN'; this.openedAt=this.now();} }
  snapshot(){return {state:this.state,failures:this.failures,openedAt:this.openedAt};}
}
module.exports={CircuitBreaker};
