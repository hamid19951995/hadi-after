class BackpressureController { constructor({high=100,low=50}={}){this.high=high;this.low=low;this.paused=false;} update(depth){if(depth>=this.high)this.paused=true;else if(depth<=this.low)this.paused=false;return {paused:this.paused,depth};} admit(){return !this.paused;} }
module.exports={BackpressureController};
