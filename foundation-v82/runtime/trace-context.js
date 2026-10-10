const crypto=require('crypto');function id(n=16){return crypto.randomBytes(n).toString('hex');}function root(){return {traceId:id(16),spanId:id(8),parentSpanId:null};}function child(ctx){return {traceId:ctx.traceId,spanId:id(8),parentSpanId:ctx.spanId};}function header(ctx){return `00-${ctx.traceId}-${ctx.spanId}-01`;}
module.exports={root,child,header};
