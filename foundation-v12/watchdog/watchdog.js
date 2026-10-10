class Watchdog { constructor({timeoutMs=30000,onTimeout=()=>{}}={}){this.timeoutMs=timeoutMs;this.onTimeout=onTimeout;this.last=Date.now();} beat(){this.last=Date.now();} check(){if(Date.now()-this.last>this.timeoutMs){this.onTimeout();return false;}return true;} }
module.exports={Watchdog};
