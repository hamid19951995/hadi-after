const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync(__dirname + '/../js/aepipe.js', 'utf8');
const storage = {};
const context = { localStorage: { getItem: k => storage[k] || null, setItem: (k,v) => storage[k] = v }, Date, Math, JSON, window: null };
context.window = context;
vm.runInNewContext(source, context);
const p = context.AEPipe;
const e = p.dryRun('addTextLayer', { text: 'Ω' }, 'test');
if (e.state !== p.STATES.DRY_RUN) throw new Error('dry run state');
if (!p.approve(e) || e.state !== p.STATES.LEASED) throw new Error('lease state');
p.beginApply(e);
p.recordResult(e, { ok: true, message: 'applied' });
p.verify(e, { project: 'test.aep', compositions: [] }, { ok: true, issues: [], warnings: [] }, { ok: true, hostReadback: { verified: true, after: { project: 'test.aep' } } });
if (e.state !== p.STATES.SUCCESS) throw new Error('verified success state');
const unresolved = p.dryRun('addTextLayer', {}, 'test');
p.approve(unresolved);
p.beginApply(unresolved);
p.recordResult(unresolved, { ok: true });
p.verify(unresolved, { ok: true }, { ok: true }, { ok: true });
if (unresolved.state !== p.STATES.UNKNOWN) throw new Error('unknown must remain unknown');
const unhealthy = p.dryRun('addTextLayer', {}, 'test');
p.approve(unhealthy);
p.beginApply(unhealthy);
p.recordResult(unhealthy, { ok: true });
p.verify(unhealthy, { project: 'test.aep', compositions: [] }, { ok: false }, { ok: true, hostReadback: { verified: true, after: { project: 'test.aep' } } });
if (unhealthy.state !== p.STATES.UNKNOWN) throw new Error('unhealthy host must remain unknown');
const skippedApply = p.dryRun('addTextLayer', {}, 'test');
p.approve(skippedApply);
try { p.recordResult(skippedApply, { ok: true }); throw new Error('result without apply must be rejected'); }
catch (error) { if (error.code !== 'AEPIPE_INVALID_RESULT_STATE') throw error; }
const expired = p.dryRun('addTextLayer', {}, 'test');
p.approve(expired);
expired.lease.expiresAt = new Date(Date.now() - 1000).toISOString();
try { p.beginApply(expired); throw new Error('expired lease must be rejected'); }
catch (error) { if (error.code !== 'AEPIPE_LEASE_INVALID') throw error; }
const readOnly = p.dryRun('summary', {}, 'test');
p.beginApply(readOnly);
p.recordResult(readOnly, { ok: true, project: 'test.aep', compositions: [] });
p.completeReadOnly(readOnly, { ok: true, project: 'test.aep', compositions: [] });
if (readOnly.state !== p.STATES.SUCCESS) throw new Error('read-only host result should complete');
const invalidTransition = p.dryRun('summary', {}, 'test');
try { p.verify(invalidTransition, {}, {}, {}); throw new Error('verification from LEASED must be rejected'); }
catch (error) { if (error.code !== 'AEPIPE_INVALID_VERIFICATION_STATE') throw error; }
const existingIssue = { code: 'MISSING_FOOTAGE', item: 'old.mov' };
const baseline = { ok: false, issues: [existingIssue], warnings: [] };
const unchangedHealth = p.dryRun('addTextLayer', { text: 'Unrelated edit' }, 'test');
unchangedHealth.baselineHealth = baseline;
p.approve(unchangedHealth);
p.beginApply(unchangedHealth);
p.recordResult(unchangedHealth, { ok: true });
p.verify(unchangedHealth, { project: 'test.aep', compositions: [] }, baseline, { ok: true, hostReadback: { verified: true, after: { project: 'test.aep' } } });
if (unchangedHealth.state !== p.STATES.SUCCESS) throw new Error('pre-existing health issues must not block an unrelated verified change');
const introducedIssue = p.dryRun('addTextLayer', { text: 'New issue' }, 'test');
introducedIssue.baselineHealth = baseline;
p.approve(introducedIssue);
p.beginApply(introducedIssue);
p.recordResult(introducedIssue, { ok: true });
p.verify(introducedIssue, { project: 'test.aep', compositions: [] }, { ok: false, issues: [existingIssue, { code: 'EXPRESSION_ERROR', layer: 'New Layer' }], warnings: [] }, { ok: true, hostReadback: { verified: true, after: { project: 'test.aep' } } });
if (introducedIssue.state !== p.STATES.UNKNOWN) throw new Error('a newly introduced health issue must prevent successful verification');
const blockedBeforeApply = p.dryRun('addTextLayer', {}, 'test');
p.approve(blockedBeforeApply);
p.failBeforeApply(blockedBeforeApply, 'Health baseline unavailable.');
if (blockedBeforeApply.state !== p.STATES.FAILED) throw new Error('failed host preflight must stop before applying');
console.log('AEPIPE tests passed');
