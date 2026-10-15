const { BridgeCycleRunner } = require('../src/engine/bridge_cycle_runner');
const fs = require('node:fs');
const path = require('node:path');

(async function main() {
  const repoRoot = process.cwd();

  // Construct a minimal valid job per contracts/job.schema.json
  const job = {
    jobId: 'job-stage10-render-001',
    opId: 'op-stage10-sim',
    stage: 'stage10-render',
    createdAt: new Date().toISOString(),
    issuer: 'sim-test',
    policy: {
      retries: 0,
      timeouts: { stepMs: 1000, verificationMs: 5000 }
    },
    manifestRef: 'manifests/stage10-manifest.json',
    inputs: {},
    inputHash: 'sim-input-hash',
    steps: [
      {
        id: 'step-render-queue',
        name: 'Render STAGE9_TITLES',
        type: 'bridge',
        runScript: { path: 'scripts/stage10-bridge-live-runner.jsx' }
      }
    ],
    expectedState: {},
    evidencePath: 'evidence/ae/job-stage10-render-001/receipt.json'
  };

  const runner = new BridgeCycleRunner({
    repoRoot,
    pollIntervalMs: 200,
    maxWaitMs: 10000,
    initialDelayMs: 2000
  });

  // Ensure outbox exists and schedule a simulated AE response to be created during the runner startup delay
  const outboxDir = path.join(repoRoot, 'bridge', 'outbox');
  fs.mkdirSync(outboxDir, { recursive: true });

  setTimeout(() => {
    const resp = {
      responseVersion: '1.0.0',
      jobId: job.jobId,
      status: 'succeeded',
      stepResults: [
        { step: 'step-render-queue', status: 'succeeded', details: 'Simulated by test harness' }
      ],
      completedAt: new Date().toISOString()
    };

    fs.writeFileSync(path.join(outboxDir, 'current.response.json'), JSON.stringify(resp, null, 2), 'utf8');
    console.log('[simulate] Wrote simulated outbox response');
  }, 1000);

  try {
    console.log('[simulate] Invoking BridgeCycleRunner.runOnce (will wait initialDelay)...');
    const res = await runner.runOnce(job, { initialDelayMs: 2000 });
    console.log('[simulate] runOnce result:', JSON.stringify(res, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('[simulate] runOnce failed:', err && err.stack ? err.stack : err);
    process.exit(2);
  }
})();
