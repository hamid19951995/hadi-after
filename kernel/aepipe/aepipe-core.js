"use strict";

const STATES = Object.freeze({
  PROPOSED:"PROPOSED", SCOPE_VALIDATED:"SCOPE_VALIDATED", PREFLIGHT:"PREFLIGHT",
  SIMULATED:"SIMULATED", DRY_RUN:"DRY_RUN", APPROVAL_REQUIRED:"APPROVAL_REQUIRED",
  LEASED:"LEASED", APPLYING:"APPLYING", READBACK:"READBACK", VERIFYING:"VERIFYING",
  SUCCESS:"SUCCESS", FAILED:"FAILED", UNKNOWN:"UNKNOWN", CANCELLED:"CANCELLED",
  FROZEN:"FROZEN", ROLLED_BACK:"ROLLED_BACK"
});
const TERMINAL = new Set([STATES.SUCCESS,STATES.FAILED,STATES.UNKNOWN,STATES.CANCELLED,STATES.ROLLED_BACK]);
const MUTATING = new Set(["createProject","addTextLayer","addSolidLayer","addRectangleShape","addEllipseShape","addCamera","addLight","addDropShadow","duplicateSelectedLayer","addGaussianBlur","buildAntiTheftTeaser","setOpacityExpression","removeSelectedLayers","renderQueue","queueComposition","saveProject","snapshotProject","restoreSnapshot","importFootage","buildAudioTeaser","updateSelectedLayer","editLayer","animateSelectedOpacity","transformSelectedLayer","updateComposition","openComposition","openProject","runScript"]);
const ALLOWED_TRANSITIONS = {
  PROPOSED:[STATES.SCOPE_VALIDATED,STATES.CANCELLED], SCOPE_VALIDATED:[STATES.PREFLIGHT,STATES.CANCELLED],
  PREFLIGHT:[STATES.SIMULATED,STATES.DRY_RUN,STATES.APPROVAL_REQUIRED,STATES.FAILED,STATES.CANCELLED],
  SIMULATED:[STATES.DRY_RUN,STATES.APPROVAL_REQUIRED,STATES.FAILED], DRY_RUN:[STATES.APPROVAL_REQUIRED,STATES.LEASED,STATES.CANCELLED],
  APPROVAL_REQUIRED:[STATES.LEASED,STATES.CANCELLED], LEASED:[STATES.APPLYING,STATES.CANCELLED,STATES.UNKNOWN],
  APPLYING:[STATES.READBACK,STATES.FAILED,STATES.UNKNOWN,STATES.CANCELLED], READBACK:[STATES.VERIFYING,STATES.UNKNOWN],
  VERIFYING:[STATES.SUCCESS,STATES.FAILED,STATES.UNKNOWN,STATES.ROLLED_BACK],
  FROZEN:[STATES.ROLLED_BACK,STATES.UNKNOWN,STATES.CANCELLED]
};
function iso(){return new Date().toISOString();}
function uid(prefix){return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;}
function clone(v){return v===undefined?undefined:JSON.parse(JSON.stringify(v));}
function isMutation(action){return MUTATING.has(action);}
function assert(cond,msg,code="AEPIPE_VALIDATION_ERROR"){if(!cond){const e=new Error(msg);e.code=code;throw e;}}
const crypto=require("crypto");
// Use canonical crypto helpers for deterministic hashes
const {canonicalize, sha256} = require("../crypto/canonical");
function hashString(s){ // compatibility: strings hashed directly, objects via canonical sha256
  if (typeof s === "string") return crypto.createHash("sha256").update(s,"utf8").digest("hex");
  return sha256(s);
}
function createAction(action,payload={},opts={}){
  assert(typeof action==='string'&&action.trim(),'action is required');
  const mut=isMutation(action);
  const env={version:"2.0.0",id:uid('op'),operationId:uid('operation'),action, intent:{source:opts.source||'user',command:action,payload:clone(payload)},
    scope:{host:'after-effects',project:opts.project||'active',userOwnedState:true},
    authority:{modelMayPropose:true,agentMayPlan:true,runtimeMustAuthorize:true,aepipeMustAuthorize:true,userApprovalRequired:mut||!!opts.userApprovalRequired},
    policy:{mode:'DRY_RUN',failClosed:true,reversible:opts.reversible!==false,risk:opts.risk|| (mut?'MEDIUM':'LOW'),maxDurationMs:opts.maxDurationMs||120000},
    idempotencyKey:opts.idempotencyKey||uid('idem'), preconditions:clone(opts.preconditions||[]),postconditions:clone(opts.postconditions||[]),
    verification:{required:true,strategy:opts.verificationStrategy||'readback+postcondition'},lease:null,state:STATES.PROPOSED,evidence:[],audit:[],createdAt:iso(),updatedAt:iso()};
  // Deterministic specHash: canonicalize the spec before hashing
  const specForHash = {action,payload:clone(payload),scope:env.scope,policy:env.policy,preconditions:env.preconditions,postconditions:env.postconditions};
  env.specHash = sha256(specForHash);
  return env;
}
function transition(env,next,detail){assert(env&&env.state,'invalid envelope');if(env.state===next)return env;const allowed=ALLOWED_TRANSITIONS[env.state]||[];assert(allowed.includes(next),`Illegal transition ${env.state} -> ${next}`,'AEPIPE_ILLEGAL_TRANSITION');env.state=next;env.updatedAt=iso();env.evidence.push({type:'state',at:env.updatedAt,state:next,detail:detail||null});return env;}
function preflight(env,ctx={}){assert(!TERMINAL.has(env.state),'operation is terminal');assert(env.policy.failClosed===true,'failClosed is mandatory');if(env.scope.host!=='after-effects')throw new Error('Unsupported host');env.evidence.push({type:'preflight',at:iso(),scope:clone(env.scope),context:clone(ctx)}); // ensure both transitions run
  transition(env,STATES.SCOPE_VALIDATED,'scope accepted');
  return transition(env,STATES.PREFLIGHT,'preflight complete');
}
function runPreflight(env,ctx={}){if(env.state===STATES.PROPOSED)transition(env,STATES.SCOPE_VALIDATED,'scope accepted');return transition(env,STATES.PREFLIGHT,'preflight complete');}
function dryRun(env,simulation={}){assert(env.state===STATES.PREFLIGHT||env.state===STATES.SIMULATED||env.state===STATES.DRY_RUN,'DRY_RUN requires PREFLIGHT');env.evidence.push({type:'simulation',at:iso(),simulation:clone(simulation)});if(env.state===STATES.PREFLIGHT)transition(env,STATES.SIMULATED,'simulation recorded');return transition(env,STATES.DRY_RUN,'no host mutation performed');}
function approve(env,approver='user'){assert(env.state===STATES.DRY_RUN||env.state===STATES.APPROVAL_REQUIRED,'approval requires DRY_RUN');env.policy.mode='APPLY';env.authority.approvedBy=approver;env.authority.approvedAt=iso();return transition(env,STATES.LEASED,'approval recorded');}
function issueLease(env,opts={}){assert(env.authority.approvedBy,"approval identity required","AEPIPE_APPROVAL_REQUIRED");assert(env.state===STATES.LEASED,'lease requires approved operation');const ttl=Math.min(Math.max(opts.ttlMs||120000,1000),env.policy.maxDurationMs||120000);env.lease={id:uid('lease'),nonce:uid('nonce'),issuedAt:iso(),expiresAt:new Date(Date.now()+ttl).toISOString(),authority:env.authority.approvedBy||'user',scopeHash:sha256(env.scope),revokedAt:null};env.evidence.push({type:'lease-issued',at:iso(),leaseId:env.lease.id,expiresAt:env.lease.expiresAt});return env;}
function leaseValid(env,nowMs=Date.now()){return !!(env.lease&&!env.lease.revokedAt&&Date.parse(env.lease.expiresAt)>nowMs);} 
function revokeLease(env,reason='revoked'){if(env.lease)env.lease.revokedAt=iso();env.evidence.push({type:'lease-revoked',at:iso(),reason});return env;}
function beginApply(env){assert(env.state===STATES.LEASED,'APPLY requires LEASED');assert(leaseValid(env),'execution lease is expired or revoked','AEPIPE_LEASE_INVALID');return transition(env,STATES.APPLYING,'execution lease validated');}
function recordReadback(env,result){assert(env.state===STATES.APPLYING,'readback requires APPLYING');env.evidence.push({type:'readback',at:iso(),result:clone(result)});if(!result||result.ok===false)return transition(env,STATES.FAILED,(result&&result.message)||'host execution failed');return transition(env,STATES.READBACK,'host response captured');}
function verify(env,{readback,postconditionsMet,healthOk=true}={}){assert(env.state===STATES.READBACK||env.state===STATES.VERIFYING,'verification requires READBACK');if(env.state===STATES.READBACK)transition(env,STATES.VERIFYING,'verification started');const verified=!!(readback&&readback.ok!==false&&postconditionsMet===true&&healthOk===true);env.evidence.push({type:'verification',at:iso(),verified,postconditionsMet:!!postconditionsMet,healthOk});if(verified)return transition(env,STATES.SUCCESS,'independent verification passed');return transition(env,STATES.UNKNOWN,'verification incomplete; success is forbidden');}
function cancel(env,reason='cancelled'){if(TERMINAL.has(env.state))return env;if(env.lease)revokeLease(env,reason);return transition(env,STATES.CANCELLED,reason);}
function unknown(env,reason){if(!TERMINAL.has(env.state))transition(env,STATES.UNKNOWN,reason||'verification unavailable');return env;}
function auditRecord(env,event,data={}){const prev=env.audit.length?env.audit[env.audit.length-1].hash:'GENESIS';const rec={seq:env.audit.length+1,at:iso(),operationId:env.operationId,event,data,prevHash:prev};rec.hash=sha256(rec);env.audit.push(rec);return rec;}

// Checkpoint: must be created only after verification SUCCESS.
// Checkpoint includes deterministic specHash and evidence/audit pointers and is appended to evidence.
function createCheckpoint(env){
  assert(env && env.state, 'invalid envelope', 'AEPIPE_INVALID_ENVELOPE');
  assert(env.state === STATES.SUCCESS, 'checkpoint requires SUCCESS verification', 'AEPIPE_CHECKPOINT_INVALID');
  const lastAuditHash = env.audit.length ? env.audit[env.audit.length - 1].hash : 'GENESIS';
  const cp = { specHash: env.specHash, state: env.state, evidenceCount: env.evidence.length, auditHash: lastAuditHash, createdAt: iso() };
  env.evidence.push({ type: 'checkpoint', at: iso(), checkpoint: cp });
  return cp;
}

// Resume validation: ensure checkpoint matches intended plan (specHash).
// Throws AEPIPE_CHECKPOINT_MISMATCH on mismatch.
function resumeFromCheckpoint(env, checkpoint){
  assert(env && env.state !== undefined, 'invalid envelope', 'AEPIPE_INVALID_ENVELOPE');
  assert(checkpoint && checkpoint.specHash, 'invalid checkpoint', 'AEPIPE_INVALID_CHECKPOINT');
  if (checkpoint.specHash !== env.specHash) {
    const e = new Error('checkpoint spec mismatch');
    e.code = 'AEPIPE_CHECKPOINT_MISMATCH';
    throw e;
  }
  env.evidence.push({ type: 'resume', at: iso(), from: checkpoint.specHash });
  return env;
}

module.exports={STATES,MUTATING,TERMINAL,isMutation,createAction,transition,runPreflight,dryRun,approve,issueLease,leaseValid,revokeLease,beginApply,recordReadback,verify,cancel,unknown,auditRecord,hashString,createCheckpoint,resumeFromCheckpoint};
