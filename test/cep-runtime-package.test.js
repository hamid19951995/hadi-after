const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'html', 'index.html'), 'utf8');
const installScript = fs.readFileSync(path.join(root, 'install-dev.ps1'), 'utf8');
const distribution = path.join(root, 'dist', 'ae-boss-omega-offline-v155');
const scriptPaths = Array.from(html.matchAll(/<script\s+src="([^"]+)"/g), (match) => match[1]);

assert(scriptPaths.some((src) => src === '../runtime/agent-session.js'), 'CEP page must load the agent session runtime');
assert(scriptPaths.some((src) => src === '../runtime/workflow-run.js'), 'CEP page must load the workflow run runtime');
assert.match(installScript, /CEP\\extensions\\com\.aeboss\.omega/, 'installer must target the bundle ID used by the AE panel manifest');
assert.match(installScript, /Join-Path \$source "runtime"/, 'installer must copy runtime modules');
assert.match(installScript, /Join-Path \$source "offline-runtime"/, 'installer must copy the offline Python runtime');
assert(fs.existsSync(path.join(root, 'offline-runtime', 'offline_engine.py')), 'offline Python engine must exist');
assert(fs.existsSync(path.join(distribution, 'offline-runtime', 'offline_engine.py')), 'offline Python engine must be packaged');
for (const src of scriptPaths) {
    const relative = src.replace(/^\.\.\//, '');
    assert(fs.existsSync(path.join(root, relative)), `source script is missing: ${src}`);
    assert(fs.existsSync(path.join(distribution, relative)), `offline distribution script is missing: ${src}`);
}

const manifest = JSON.parse(fs.readFileSync(path.join(distribution, 'BUILD-MANIFEST-OFFLINE-V155.json'), 'utf8'));
const workflowFiles = [
    'runtime/workflow-run.js',
    'runtime/agent-session.js',
    'js/app.js',
    'js/minimal-ui.js',
    'js/production-dashboard.js',
    'jsx/host.jsx',
    'html/index.html'
];
for (const relative of workflowFiles) {
    const sourceBytes = fs.readFileSync(path.join(root, relative));
    const packageBytes = fs.readFileSync(path.join(distribution, relative));
    assert(sourceBytes.equals(packageBytes), `offline workflow differs from source: ${relative}`);
    const entries = manifest.files.filter(entry => entry.path === relative);
    assert.strictEqual(entries.length, 1, `workflow file must have one manifest entry: ${relative}`);
    assert.strictEqual(entries[0].bytes, packageBytes.length, `manifest byte count differs: ${relative}`);
    assert.strictEqual(entries[0].sha256, crypto.createHash('sha256').update(packageBytes).digest('hex'), `manifest hash differs: ${relative}`);
}

console.log('CEP runtime package tests passed');
