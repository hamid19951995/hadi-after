function batch(ops, limit){if(!Number.isInteger(limit)||limit<1)throw new Error('invalid limit');const out=[];let cur=[];for(const op of ops||[]){cur.push(op);if(cur.length===limit){out.push(cur);cur=[]}}if(cur.length)out.push(cur);return out}
module.exports={batch};
