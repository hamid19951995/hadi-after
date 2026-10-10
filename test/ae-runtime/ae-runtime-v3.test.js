const assert = require("assert");
const {AERuntimeV3, sha256} = require("../../runtime/ae/ae-runtime-v3");

(async () => {
  let calls = [];
  const rt = new AERuntimeV3({
    executor: async ({phase, operation}) => {
      calls.push(phase);
      if (phase === "APPLY") return {applied:true};
      return {verified:true, operationId:operation.operationId};
    }
  });

  const target = {composition:"Main"};
  const action = "layer.create";
  const scopeHash = sha256({action,target});
  const {operation:op} = rt.createOperation({
    operationId:"op-v3-0001",
    idempotencyKey:"idem-v3-0001",
    action,target,mode:"APPLY",
    parameters:{name:"TITLE"},
    authorization:{
      leaseId:"lease-v3-0001", scopeHash,
      approved:true,
      expiresAt:new Date(Date.now()+60000).toISOString()
    }
  });

  const result = await rt.execute(op);
  assert.strictEqual(result.state,"DONE");
  assert.deepStrictEqual(calls,["APPLY","READBACK"]);
  assert.ok(op.evidence && op.evidence.hash);
  assert.strictEqual(rt.verifyAudit(op),true);

  // Unknown must remain Unknown.
  const rt2 = new AERuntimeV3({
    executor: async ({phase}) => phase==="APPLY" ? {applied:true} : {verified:false}
  });
  const scope2 = sha256({action,target});
  const {operation:op2} = rt2.createOperation({
    operationId:"op-v3-0002", action,target,mode:"APPLY",
    authorization:{leaseId:"lease-v3-0002",scopeHash:scope2,approved:true,
      expiresAt:new Date(Date.now()+60000).toISOString()}
  });
  const r2 = await rt2.execute(op2);
  assert.strictEqual(r2.state,"UNKNOWN");

  console.log("AE BOSS Ω Foundation v3 AE Runtime tests passed");
})();
