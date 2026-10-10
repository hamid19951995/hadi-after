const assert=require("assert");
const fs=require("fs"),path=require("path"),os=require("os");
const {ExecutionOrchestratorV7,STATES}=require("../../orchestration/execution-orchestrator-v7");
const {PersistentOperationJournalV2}=require("../../journal/persistent-operation-journal-v2");
const {CapabilityRegistryV1}=require("../../capability/capability-registry-v1");
const {HeartbeatMonitorV1}=require("../../health/heartbeat-monitor-v1");
const {ApprovalTokenV1}=require("../../approval/approval-token-v1");
const {PersistentIdempotencyStoreV3}=require("../../idempotency/store-v3");

(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"aeboss-v7-"));
 const journal=new PersistentOperationJournalV2({file:path.join(dir,"journal.ndjson")});
 const idem=new PersistentIdempotencyStoreV3({file:path.join(dir,"idempotency.json")});
 const caps=new CapabilityRegistryV1({
   "layer.create":{mutates:true,enabled:true,risk:"LOW"},
   "project.inspect":{mutates:false,enabled:true,risk:"LOW"},
   "script.execute":{mutates:true,enabled:true,sandbox:true}
 });
 const hb=new HeartbeatMonitorV1({timeoutMs:1000});hb.beat({host:"after-effects",version:"test"});
 const approval=new ApprovalTokenV1({ttlMs:10000});
 let executed=0;
 const controller={
   plan(i){return {operationId:i.operationId,action:i.action,target:i.target||{},parameters:i.parameters||{},specHash:"spec-"+i.operationId};},
   async execute(plan,expected){executed++;return {result:{status:"VERIFIED",afterHash:"ok",expected}};}
 };
 const o=new ExecutionOrchestratorV7({controller,journal,capabilities:caps,heartbeat:hb,approval,idempotency:idem});
 const q=o.enqueue({operationId:"op-1",action:"layer.create",idempotencyKey:"idem-1",expectedState:{layers:1}});
 await o.plan("op-1");
 assert.equal(o.operations.get("op-1").state,STATES.APPROVAL_REQUIRED);
 assert.equal(executed,0,"mutation executed before approval");
 o.approve("op-1","human");
 const done=await o.next();assert.equal(done.state,STATES.DONE);assert.equal(executed,1);
 assert.equal(o.verifyLedger(done),true);assert.equal(journal.verify().ok,true);

 const replay=o.enqueue({operationId:"op-2",action:"layer.create",idempotencyKey:"idem-1",expectedState:{layers:1}});
 assert.equal(replay.replay,true);

 assert.throws(()=>o.enqueue({operationId:"op-read",action:"script.execute",expectedState:{ok:true}}),/SANDBOX_REQUIRED/);
 const pending=o.enqueue({operationId:"op-p",action:"project.inspect"});o.operations.get("op-p").state=STATES.DONE;await assert.rejects(()=>o.plan("op-p"),/OPERATION_TERMINAL/);

 const rows=journal.readAll();rows[rows.length-1].data.tampered=true;fs.writeFileSync(path.join(dir,"journal.ndjson"),rows.map(JSON.stringify).join("\n")+"\n");
 assert.equal(journal.verify().ok,false);
 fs.rmSync(dir,{recursive:true,force:true});
 console.log("AE BOSS Omega Foundation v7 tests passed");
})().catch(e=>{console.error(e);process.exit(1)});
