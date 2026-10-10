const TABLE={CANCELLED:{retryable:false},PERMISSION_DENIED:{retryable:false},VALIDATION_FAILED:{retryable:false},AE_BRIDGE_TIMEOUT:{retryable:true},AE_HOST_UNHEALTHY:{retryable:true},OUTPUT_MISSING:{retryable:true},UNKNOWN:{retryable:false}};
function classify(err){const code=err&&err.code||'UNKNOWN';return {code,retryable:!!(TABLE[code]||TABLE.UNKNOWN).retryable,category:code.startsWith('AE_')?'HOST':code.includes('PERMISSION')?'SECURITY':'RUNTIME'}}
module.exports={classify,TABLE};
