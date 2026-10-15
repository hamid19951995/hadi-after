"use strict";
const DESTRUCTIVE=new Set(["removeSelectedLayers","restoreSnapshot"]);
const HIGH_RISK=new Set(["renderQueue","queueComposition","importFootage","runScript","openProject","saveProject"]);
const READ_ONLY=new Set(["summary","healthReport","inspectLayer","selectLayer","runValidationHarness","planWorkflow"]);

function evaluate(env){
  if(!env||!env.policy||env.policy.failClosed!==true) return {allow:false,risk:"CRITICAL",reasons:["failClosed policy is mandatory"],requiresApproval:true,failClosed:true,decision:"DENY",permissions:{fileSystem:false,network:false,externalProcess:false,runScriptSandbox:false}};
  const reasons=[];
  let risk=env.policy.risk||"LOW";
  if(DESTRUCTIVE.has(env.action)){ risk="HIGH"; reasons.push("destructive action"); }
  if(HIGH_RISK.has(env.action)){ risk=risk==="HIGH"?"HIGH":"MEDIUM"; reasons.push("host/system sensitive action"); }
  if(env.action==="runScript") reasons.push("sandbox and hash-bound approval required");
  const requiresApproval=!READ_ONLY.has(env.action)||env.authority.userApprovalRequired===true;
  const approved=!requiresApproval||!!env.authority.approvedBy;
  // permissions: default fail-closed
  const permissions = {
    fileSystem: false,
    network: false,
    externalProcess: false,
    runScriptSandbox: env.action === "runScript"
  };
  // allow minimal read-only operations filesystem-safe
  if (READ_ONLY.has(env.action)) permissions.fileSystem = false;
  // grant file system for explicit non-destructive actions when approved
  if (approved && !DESTRUCTIVE.has(env.action)) {
    if (env.action.startsWith("import") || env.action === "saveProject" || env.action === "openProject") permissions.fileSystem = true;
  }
  return {allow:approved,risk,reasons,requiresApproval:!approved,failClosed:true,decision:approved?"ALLOW_PENDING_LEASE":"REQUIRE_APPROVAL",permissions};
}

module.exports={evaluate,READ_ONLY,DESTRUCTIVE,HIGH_RISK};
