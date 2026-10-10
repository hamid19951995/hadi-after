'use strict';
function ok(value,meta={}){return {ok:true,value,meta};}function fail(code,message,meta={}){if(!code)throw new Error('ERROR_CODE_REQUIRED');return {ok:false,error:{code,message:message||code},meta};}function unwrap(x){if(!x||typeof x.ok!=='boolean')throw new Error('INVALID_OUTCOME');if(!x.ok){const e=new Error(x.error.message);e.code=x.error.code;throw e;}return x.value;}
module.exports={ok,fail,unwrap};
