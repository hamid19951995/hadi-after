const assert = require("assert");
const {BridgeProtocolV1, sha256} = require("../../runtime/ae/bridge/bridge-protocol-v1");
const {AETransactionV1} = require("../../runtime/ae/recovery/transaction-v1");

(async () => {
  const bridge = new BridgeProtocolV1({clock:()=>1700000000000});
  const target = {composition:"BOSS_GOLDEN"};
  const scopeHash = sha256({action:"layer.create",target});
  const env = bridge.create({
    operationId:"op-v4-0001",
    phase:"APPLY",
    action:"layer.create",
    target,
    authorization:{leaseId:"lease-v4-0001",scopeHash}
  });
  assert.strictEqual(bridge.validate(env,{
    expectedLeaseId:"lease-v4-0001",
    expectedScopeHash:scopeHash
  }),true);
  assert.throws(()=>bridge.validate(env),/REPLAY_DETECTED/);

  const state = {layers:[{name:"BOSS_TEST",opacity:100}]};
  let current = {layers:[]};
  const txEngine = new AETransactionV1({
    snapshotReader: async()=>JSON.parse(JSON.stringify(current)),
    actionExecutor: async()=>{ current=JSON.parse(JSON.stringify(state)); return {applied:true}; },
    rollbackExecutor: async(before)=>{ current=before; return {restored:true}; }
  });
  const op={operationId:"op-v4-tx"};
  const tx=await txEngine.begin(op);
  await txEngine.apply(tx,op);
  await txEngine.verify(tx,state);
  assert.strictEqual(tx.verified,true);
  assert.strictEqual(tx.status,"VERIFIED");

  // Mismatch must not become success.
  current={layers:[]};
  const tx2=await txEngine.begin({operationId:"op-v4-mismatch"});
  tx2.result=await txEngine.actionExecutor(op);
  current={layers:[{name:"WRONG"}]};
  await txEngine.verify(tx2,state);
  assert.strictEqual(tx2.verified,false);
  assert.strictEqual(tx2.status,"MISMATCH");

  console.log("AE BOSS Ω Foundation v4 Real AE Bridge protocol tests passed");
})();
