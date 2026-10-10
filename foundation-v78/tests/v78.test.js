const assert=require('assert');
const {CircuitBreaker}=require('../../foundation-v71/runtime/circuit-breaker');let t=0;const b=new CircuitBreaker({failureThreshold:2,resetMs:10,now:()=>t});b.failure();b.failure();assert.equal(b.allow(),false);t=11;assert.equal(b.allow(),true);b.success();assert.equal(b.snapshot().state,'CLOSED');
const {RetryBudget}=require('../../foundation-v72/runtime/retry-budget');const r=new RetryBudget({maxAttempts:3,maxTotalMs:100,now:()=>50});assert(r.canRetry({attempt:2,startedAt:0}));
const {ResourceScheduler}=require('../../foundation-v73/runtime/resource-scheduler');const s=new ResourceScheduler({limits:{ae:1}});const j={resources:{ae:1}};assert(s.start(j));assert(!s.start(j));s.finish(j);assert(s.start(j));
const {validateConfig}=require('../../foundation-v75/runtime/config-schema');assert(validateConfig({x:1},{required:{x:{type:'number'}},additional:false}).ok);
const {provenance}=require('../../foundation-v76/runtime/provenance');assert.equal(provenance({artifact:'x',inputs:['a'],producer:'p',version:'1'}).inputHashes.length,1);
const {shouldInject}=require('../../foundation-v77/runtime/chaos');assert(shouldInject({active:true,at:2},2));
const {benchmark}=require('../runtime/benchmark');benchmark('x',async()=>{}, {iterations:2,now:(()=>{let n=0;return()=>++n})()}).then(x=>{assert.equal(x.iterations,2);console.log('v78 PASS');});
