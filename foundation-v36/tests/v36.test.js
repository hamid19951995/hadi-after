'use strict';const assert=require('assert');const {PermissionManager,WindowsTerminal,AutomationOrchestrator}=require('..');
const pm=new PermissionManager();const term=new WindowsTerminal({permissions:pm,dryRun:true});
assert.throws(()=>term.run('Get-ChildItem'),/Permission denied/);
pm.grant('terminal.windows','execute',{reason:'user approved'});let r=term.run('Get-ChildItem');assert.equal(r.ok,true);assert.equal(r.dryRun,true);
assert.throws(()=>term.run('shutdown /s'),/blocked/);
const o=new AutomationOrchestrator({terminal:term,permissions:pm});const j=o.execute({steps:[{name:'list',command:'Get-ChildItem'}]});assert.equal(j.status,'completed');
console.log('v36.test PASS');
