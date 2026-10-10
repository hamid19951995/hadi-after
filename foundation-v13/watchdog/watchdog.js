'use strict'; class Watchdog {constructor({timeoutMs=30000,onTimeout=()=>{}}={}){this.timeoutMs=timeoutMs;this.onTimeout=onTimeout;this.last=Date.now();this.tripped=false;}beat(){this.last=Date.now();this.tripped=false;}check(){if(Date.now()-this.last>this.timeoutMs){if(!this.tripped){this.tripped=true;this.onTimeout();}return false;}return true;}}
module.exports={Watchdog};
