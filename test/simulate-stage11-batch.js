const { runJob } = require('../src/engine/engine');
const fs = require('node:fs');
const path = require('node:path');

(async function main(){
  const repoRoot = process.cwd();
  const manifestPath = path.join(repoRoot, 'manifests', 'stage11-manifest.json');
  if (!fs.existsSync(manifestPath)){
    console.error('[simulate-stage11] Manifest not found:', manifestPath);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  const job = {
    jobId: manifest.jobId,
    opId: 'op-stage11-sim',
    stage: 'stage11-batch',
    createdAt: new Date().toISOString(),
    issuer: 'simulate-stage11',
    policy: { retries: 0, timeouts: { stepMs: 1000, verificationMs: 5000 } },
    manifestRef: path.relative(repoRoot, manifestPath).replace(/\\/g, '/'),
    inputs: {},
    inputHash: 'sim-stage11-input',
    steps: manifest.steps,
    expectedState: null,
    evidencePath: path.join('evidence','ae', manifest.jobId, 'receipt.json')
  };

  // Prepare outbox
  const outboxDir = path.join(repoRoot, 'bridge', 'outbox');
  fs.mkdirSync(outboxDir, { recursive: true });

  // Schedule simulated responses for each step timed so runJob/runOnce will pick them up in sequence
  // First step: write after 1500ms
  setTimeout(() => {
    const resp1 = {
      responseVersion: '1.0.0',
      jobId: job.jobId,
      status: 'succeeded',
      stepResults: [ { step: 'step-render-comp-a', status: 'succeeded', details: 'Simulated comp A' } ],
      completedAt: new Date().toISOString()
    };
    fs.writeFileSync(path.join(outboxDir, 'current.response.json'), JSON.stringify(resp1, null, 2), 'utf8');
    console.log('[simulate-stage11] Wrote response for comp A');
  }, 1500);

  // Second step: write after 5500ms (after first step completes)
  setTimeout(() => {
    const resp2 = {
      responseVersion: '1.0.0',
      jobId: job.jobId,
      status: 'succeeded',
      stepResults: [ { step: 'step-render-comp-b', status: 'succeeded', details: 'Simulated comp B' } ],
      completedAt: new Date().toISOString()
    };
    fs.writeFileSync(path.join(outboxDir, 'current.response.json'), JSON.stringify(resp2, null, 2), 'utf8');
    console.log('[simulate-stage11] Wrote response for comp B');
  }, 5500);

  console.log('[simulate-stage11] Invoking runJob for batch manifest...');
  try {
    const receipt = await runJob(job, { workspaceRoot: repoRoot, bridgeOptions: { repoRoot, initialDelayMs: 1000, maxWaitMs: 20000 } });
    console.log('[simulate-stage11] Receipt status:', receipt.status);
    console.log(JSON.stringify(receipt, null, 2));
    process.exit(receipt.status === 'verified' || receipt.status === 'succeeded' ? 0 : 2);
  } catch (err) {
    console.error('[simulate-stage11] runJob error:', err && err.stack ? err.stack : err);
    process.exit(2);
  }
})();
