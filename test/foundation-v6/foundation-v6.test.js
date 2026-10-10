const assert=require('assert');
const {ExecutionOrchestratorV6,STATES}=require('../../orchestration/execution-orchestrator-v6');
const {PersistentOperationJournalV1}=require('../../journal/persistent-operation-journal-v1');
const {CapabilityRegistryV1}=require('../../capability/capability-registry-v1');
const {HeartbeatMonitorV1}=require('../../health/heartbeat-monitor-v1');
const {ApprovalTokenV1}=require('../../approval/approval-token-v1');
const {IdempotencyStoreV2}=require('../../idempotency/store-v2');
const {CrashRecoveryV2}=require('../../recovery/crash-recovery-v2');
const fs=require('fs'),path=require('path'),os=require('os');
(async()=>{
 const tmp=path.join(os.tmpdir(),'ae-boss-v6-'+Date.now()+'.ndjson');
 const journal=new PersistentOperationJournalV1({file:tmp});
 const capabilities=new CapabilityRegistryV1({addTextLayer:{mutates:true,enabled:true},snapshotProject:{mutates:true,enabled:true}});
 const heartbeat=new HeartbeatMonitorV1({timeoutMs:1000});heartbeat.beat({host:'after-effects',version:'test'});
 const approval=new ApprovalTokenV1({ttlMs:1000});const idempotency=new IdempotencyStoreV2();
 const controller={plan(input){return {operationId:input.operationId,action:input.action,target:input.target||{},parameters:input.parameters||{},specHash:'spec-'+input.operationId,lease:{leaseId:'lease-'+input.operationId}}},execute:async function(plan){return {result:{status:'VERIFIED',afterHash:'x'},evidence:[],complete:true,plan};}};
 const o=new ExecutionOrchestratorV6({controller,journal,capabilities,heartbeat,approval,idempotency});
 const r=o.enqueue({operationId:'op-1',action:'addTextLayer',idempotencyKey:'key-1',expectedState:{ok:true}});assert.equal(r.operation.state,STATES.QUEUED);const replay=o.enqueue({operationId:'op-1b',action:'addTextLayer',idempotencyKey:'key-1'});assert.equal(replay.replay,true);
 const done=await o.next();assert.equal(done.state,STATES.DONE);assert.equal(o.verifyLedger(done),true);assert.equal(journal.verify().ok,true);
 done.events[0].data.tampered=true;assert.equal(o.verifyLedger(done),false);

 const stale=new HeartbeatMonitorV1({timeoutMs:10,clock:(()=>{let t=0;return ()=>t;})()});assert.equal(stale.snapshot().ok,false);
 const approvalCheck=new ApprovalTokenV1({clock:(()=>{let t=0;return ()=>t;})(),ttlMs:5});const tok=approvalCheck.issue({operationId:'o',specHash:'s',action:'a',target:{x:1}});assert.equal(approvalCheck.validate(tok,{operationId:'o',specHash:'s',action:'a',target:{x:1}}),true);assert.throws(()=>approvalCheck.validate(tok,{operationId:'o',specHash:'s2',action:'a',target:{x:1}}),/APPROVAL_TOKEN_SCOPE_MISMATCH/);
 const missing=new CapabilityRegistryV1({});assert.throws(()=>missing.assert('nope'),/CAPABILITY_MISSING/);
 const recoveryJournal=new PersistentOperationJournalV1({file:tmp});const interrupted={operationId:'op-crash',action:'addTextLayer',target:{},parameters:{},state:'RUNNING',attempt:1};recoveryJournal.append(interrupted,'RUNNING',{attempt:1});const orphan={journal:recoveryJournal,orchestrator:{recover:async()=>({state:STATES.RECOVERY_REQUIRED})}};const scanner=new CrashRecoveryV2(orphan);assert.deepEqual(scanner.scan().recoverable,['op-crash']);await scanner.recoverAll();
 fs.unlinkSync(tmp);console.log('AE BOSS Omega Foundation v6 orchestration tests passed');
})();
