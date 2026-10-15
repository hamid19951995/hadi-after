const fs = require('fs');
const path = require('path');
const { FxParamValidator } = require('../src/engine/fx/fx_param_validator');

(function run() {
  const repoRoot = path.resolve(__dirname, '..');
  const jobPath = path.join(repoRoot, 'manifests', 'stage12-fx-job.json');
  const tempPath = path.join('C:/Temp/ae-boss-omega', 'fx-job.json');
  const job = JSON.parse(fs.readFileSync(jobPath, 'utf8'));

  const validator = new FxParamValidator(path.join(repoRoot, 'test', 'fixtures', 'fx-parameter-catalog.json'));
  const issues = [];

  for (const effect of (job.effects || [])) {
    const result = validator.validateEffectParameters(effect.matchName, effect.params || {});
    if (!result.valid) {
      issues.push({ matchName: effect.matchName, errors: result.errors });
    }
  }

  if (issues.length) {
    console.error(JSON.stringify(issues, null, 2));
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(tempPath), { recursive: true });
  fs.writeFileSync(tempPath, JSON.stringify(job, null, 2), 'utf8');
  console.log('FX job simulation passed');
  console.log('Temporary job written to: ' + tempPath);
})();
