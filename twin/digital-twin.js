"use strict";
const {hashString}=require('../kernel/aepipe/aepipe-core');
function snapshot(readback){return {version:'2.0.0',capturedAt:new Date().toISOString(),hash:hashString(JSON.stringify(readback||null)),state:JSON.parse(JSON.stringify(readback||null))};}
function diff(expected,actual){const e=JSON.stringify(expected||null),a=JSON.stringify(actual||null);return {equal:e===a,expectedHash:hashString(e),actualHash:hashString(a),status:e===a?'IN_SYNC':'DRIFT'};}
function reconcile(twin,actual){const d=diff(twin&&twin.state,actual);return {twin:snapshot(actual),diff:d,requiresVerification:!d.equal};}
module.exports={snapshot,diff,reconcile};
