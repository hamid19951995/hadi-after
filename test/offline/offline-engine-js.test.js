const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const file = path.join(__dirname, '..', '..', 'js', 'offline-engine.js');
const sandbox = {
  window: {
    cep: { fs: { SystemPath: { EXTENSION: 'EXTENSION' }, getSystemPath: () => path.join(__dirname, '..', '..') } }
  },
  require,
  process,
  console,
};
vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox, {filename:file});
assert(sandbox.window.AEBossOffline);
sandbox.window.AEBossOffline.health((r) => { assert.equal(r.ok,true); assert.equal(r.network,'disabled'); console.log('offline-engine.js integration: PASS'); });
