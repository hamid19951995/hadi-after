'use strict';
class DeterministicClock{constructor(start=0){this.t=start;} now(){return this.t;} advance(ms){if(!Number.isFinite(ms)||ms<0)throw new Error('INVALID_DURATION');this.t+=ms;return this.t;} snapshot(){return {time:this.t};}}
module.exports={DeterministicClock};
