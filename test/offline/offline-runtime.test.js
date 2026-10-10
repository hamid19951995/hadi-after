const assert = require('assert');
const { spawnSync } = require('child_process');
const path = require('path');
const root = path.resolve(__dirname, '..', '..');
const engine = path.join(root, 'offline-runtime', 'offline_engine.py');
function run(input) {
  const r = spawnSync(process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3'), [engine], { input: JSON.stringify(input)+'\n', encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr || `python exit ${r.status}`);
  return JSON.parse(r.stdout.trim().split(/\r?\n/).pop());
}
const h = run({op:'health'}); assert.equal(h.ok, true); assert.equal(h.network, 'disabled');
const i = run({op:'infer', text:'این کاراکتر دست تکان بده و یک فنجان را بردارد', language:'fa'}); assert.equal(i.ok, true); assert(i.commands.some(x=>x.action==='wave')); assert(i.commands.some(x=>x.action==='pickUp'));
const a = run({op:'compile_action_plan', fps:30, sceneDuration:5, actions:[{id:'a1',action:'walk',start:0,duration:2},{id:'a2',action:'wave',start:2,duration:1}]}); assert.equal(a.ok, true); assert.equal(a.plan.actions.length, 2); assert(a.plan.fingerprint);
assert.equal(run({op:'validate_action_plan', plan:a.plan}).ok, true);
const p = {props:[{id:'cup',initialState:'world'}],actions:[{propId:'cup',action:'pickUp',operationKey:'ok'}]}; assert.equal(run({op:'validate_prop_plan', plan:p}).ok, true);
console.log('offline-runtime: PASS');
