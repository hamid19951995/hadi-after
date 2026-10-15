const fs = require('node:fs');
const path = require('node:path');

(function(){
  const repoRoot = process.cwd();
  const manifestPath = path.join(repoRoot, 'manifests', 'stage11-manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error('Manifest not found:', manifestPath);
    process.exit(2);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (!manifest.steps || !Array.isArray(manifest.steps) || manifest.steps.length < 2) {
    console.error('Manifest must contain at least 2 steps for batch processing');
    process.exit(2);
  }

  for (const s of manifest.steps) {
    if (!s.id || !s.type) {
      console.error('Each step requires id and type:', JSON.stringify(s));
      process.exit(2);
    }
    if (s.type !== 'bridge') {
      console.error('Stage 11 steps must be of type "bridge" for AE batch processing');
      process.exit(2);
    }
  }

  console.log('stage11 manifest basic validation passed');
  process.exit(0);
})();
