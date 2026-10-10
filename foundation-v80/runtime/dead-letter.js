class DeadLetterQueue { constructor(){this.items=[];} push(job,reason,meta={}){const item={job,reason,meta,attempts:meta.attempts||0,at:Date.now()};this.items.push(item);return item;} list(){return this.items.slice();} requeue(index){if(index<0||index>=this.items.length)return null;return this.items.splice(index,1)[0];} }
module.exports={DeadLetterQueue};
