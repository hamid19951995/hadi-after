"use strict";
function checkpoint(env,readback){return {checkpointId:`cp-${Date.now().toString(36)}`,operationId:env.operationId,createdAt:new Date().toISOString(),state:env.state,readback:JSON.parse(JSON.stringify(readback||null))};}
function rollbackPlan(env,checkpointData){return {operationId:env.operationId,checkpointId:checkpointData&&checkpointData.checkpointId||null,required:true,reason:'post-condition verification failed',status:'PLANNED'};}
module.exports={checkpoint,rollbackPlan};
