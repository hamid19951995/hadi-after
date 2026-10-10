const assert=require("assert");
const {LeaseManagerV2}=require("../../runtime/control/lease-manager-v2");
const {EvidenceLedgerV2}=require("../../runtime/control/evidence-ledger-v2");
const {TransactionV2}=require("../../runtime/control/transaction-v2");
const {GovernedControllerV5}=require("../../runtime/control/governed-controller-v5");
(async()=>{
 const clock=(()=>{let t=1700000000000;return {now:()=>t,advance:n=>t+=n};})();
 const lm=new LeaseManagerV2({clock:clock.now,maxTtlMs:1000});
 const l=lm.issue({operationId:"op-v5-0001",action:"layer.update",target:{layer:"A"},ttlMs:500});
 assert(lm.validate(l,{operationId:"op-v5-0001",action:"layer.update",target:{layer:"A"}}));
 clock.advance(501);assert.throws(()=>lm.validate(l,{operationId:"op-v5-0001",action:"layer.update",target:{layer:"A"}}),/LEASE_EXPIRED/);

 const ledger=new EvidenceLedgerV2({clock:clock.now}), chain=[];ledger.append(chain,"A",{x:1});ledger.append(chain,"B",{x:2});assert(ledger.verify(chain));chain[0].data.x=99;assert(!ledger.verify(chain));

 let current={layers:[]};let fail=false;let mismatchOnce=false;
 const tx=new TransactionV2({
  snapshot:async()=>JSON.parse(JSON.stringify(current)),
  apply:async()=>{current={layers:[{name:"OK"}]};return {ok:true};},
  readback:async()=>{if(fail&&!mismatchOnce){mismatchOnce=true;return {layers:[{name:"WRONG"}]};}return current;},
  rollback:async before=>{current=JSON.parse(JSON.stringify(before));return {ok:true};}
 });
 const good=await tx.run({operationId:"tx-good"},{layers:[{name:"OK"}]});assert.equal(good.status,"VERIFIED");
 fail=true;mismatchOnce=false;const bad=await tx.run({operationId:"tx-bad"},{layers:[{name:"OK"}]});assert.equal(bad.status,"ROLLED_BACK");assert.equal(bad.rollbackVerified,true);

 current={layers:[]};fail=false;
 const controller=new GovernedControllerV5({
  registry:{"layer.update":{"mutates":true,"risk":"MEDIUM","readback":true}},
  host:{snapshot:async()=>({layers:current.layers.slice()}),apply:async()=>{current={layers:[{name:"OK"}]};return {ok:true}},readback:async()=>current,rollback:async before=>{current=before;return {ok:true}}},clock:clock.now
 });
 const plan=controller.plan({operationId:"op-v5-ctrl",action:"layer.update",target:{layer:"A"},parameters:{opacity:80},approvedBy:"user"});
 const out=await controller.execute(plan,{layers:[{name:"OK"}]});assert.equal(out.complete,true);assert(controller.ledger.verify(out.evidence));
 console.log("AE BOSS Ω Foundation v5 control-plane tests passed");
})();