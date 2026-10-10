"use strict";
class RenderQueueV10{
 constructor({adapter}={}){if(!adapter||typeof adapter.enqueue!=="function")throw new TypeError("adapter.enqueue required");this.adapter=adapter;this.jobs=new Map();}
 async enqueue(spec){if(!spec||!spec.renderId)throw new Error("INVALID_RENDER");if(this.jobs.has(spec.renderId))return this.jobs.get(spec.renderId);const job=await this.adapter.enqueue(spec);this.jobs.set(spec.renderId,job);return job;}
 async status(renderId){return this.adapter.status(renderId);}
 async cancel(renderId){return this.adapter.cancel(renderId);}
}
module.exports={RenderQueueV10};
