'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { runJob } = require('../src/engine/engine');

const repoRoot = path.resolve(__dirname, '..');
const jobId = 'stage9-live-e2e';
const relEvidenceReceipt = `evidence/ae/${jobId}/receipt.json`;
const snapshotAepRel = `evidence/ae/${jobId}/stage9_verified.aep`;
const snapshotAepAbs = path.join(repoRoot, snapshotAepRel).replace(/\\/g, '/');

// Ensure clean bridge state
const cleanDirs = [
  path.join(repoRoot, 'bridge', 'inbox'),
  path.join(repoRoot, 'bridge', 'outbox'),
  path.join(repoRoot, 'bridge', 'locks'),
  path.join(repoRoot, 'manifests'),
  path.join(repoRoot, 'evidence', 'ae', jobId)
];

for (const dir of cleanDirs) {
  fs.mkdirSync(dir, { recursive: true });
}

for (const f of fs.readdirSync(path.join(repoRoot, 'bridge', 'inbox'))) {
  fs.rmSync(path.join(repoRoot, 'bridge', 'inbox', f), { force: true });
}
for (const f of fs.readdirSync(path.join(repoRoot, 'bridge', 'outbox'))) {
  fs.rmSync(path.join(repoRoot, 'bridge', 'outbox', f), { force: true });
}
for (const f of fs.readdirSync(path.join(repoRoot, 'bridge', 'locks'))) {
  fs.rmSync(path.join(repoRoot, 'bridge', 'locks', f), { force: true });
}

// Create manifest
const manifestPath = path.join(repoRoot, 'manifests', 'stage9-manifest.json');
fs.writeFileSync(manifestPath, JSON.stringify({ ok: true, version: 1, stage: 'stage9' }, null, 2), 'utf8');

const job = {
  jobId,
  opId: `op-${jobId}`,
  stage: 'STAGE_9_LIVE_BRIDGE_E2E',
  createdAt: new Date().toISOString(),
  issuer: 'ae-omega-live-runner',
  policy: {
    retries: 0,
    timeouts: {
      stepMs: 60000,
      verificationMs: 60000
    }
  },
  manifestRef: path.relative(repoRoot, manifestPath).replace(/\\/g, '/'),
  inputs: { liveHost: 'AfterEffects 2026' },
  inputHash: `sha256:${jobId}`,
  steps: [
    {
      id: 'step-ae-live-titles',
      name: 'Create Compositions and Text with Motion Keyframes',
      type: 'bridge',
      bridge: {
        pollIntervalMs: 250,
        maxWaitMs: 60000
      },
      params: {
        host: 'aftereffects',
        runtime: 'production',
        ops: [
          { type: 'comp.create', name: 'STAGE9_TITLES', width: 1920, height: 1080, duration: 6, frameRate: 30 },
          { type: 'layer.addText', comp: 'STAGE9_TITLES', name: 'TitleLayer', text: 'AE BOSS OMEGA LIVE' },
          {
            type: 'property.setKeyframes',
            comp: 'STAGE9_TITLES',
            layer: 1,
            property: 'Transform/Position',
            keyframes: [
              { time: 0.0, value: [200, 540] },
              { time: 2.5, value: [960, 540] },
              { time: 5.0, value: [1720, 540] }
            ]
          },
          { type: 'project.snapshot', path: snapshotAepAbs }
        ],
        audit: {
          comp: 'STAGE9_TITLES',
          layer: 'TitleLayer',
          text: 'AE BOSS OMEGA LIVE',
          positionKeys: [[200, 540], [960, 540], [1720, 540]]
        }
      }
    }
  ],
  expectedState: null,
  evidencePath: relEvidenceReceipt
};

console.log('>>> Launching AE Host Bridge Watcher...');
const aePath = 'C:\\Program Files\\Adobe\\Adobe After Effects 2026\\Support Files\\AfterFX.exe';
const runnerJsx = path.join(repoRoot, 'scripts', 'stage9-bridge-live-runner.jsx');

const inboxFile = path.join(repoRoot, 'bridge', 'inbox', 'current.request.json');
let aeSpawned = false;

const interval = setInterval(() => {
  if (fs.existsSync(inboxFile) && !aeSpawned) {
    aeSpawned = true;
    console.log('>>> Inbox request detected! Launching After Effects 2026 (-noui -r)...');
    const child = spawn(aePath, ['-noui', '-r', runnerJsx], { detached: true, stdio: 'ignore' });
    child.unref();
    clearInterval(interval);
  }
}, 100);

(async () => {
  try {
    console.log('>>> Running engine job with BridgeCycleRunner...');
    const result = await runJob(job, repoRoot);
    console.log('>>> Engine execution finished:');
    console.log(JSON.stringify(result, null, 2));

    // Audit and trace validation
    const step = result.trace && result.trace.find(t => t.step === 'step-ae-live-titles');
    const resp = step && step.bridgeResult && step.bridgeResult.response;

    if (!resp || resp.status !== 'succeeded') {
      throw new Error('Bridge execution failed or missing response.');
    }

    const audit = resp.stepResults && resp.stepResults[0] && resp.stepResults[0].audit;
    if (!audit || audit.verified !== true) {
      throw new Error('Audit verification failed in response.');
    }

    const snapshotPath = path.join(repoRoot, snapshotAepRel);
    if (!fs.existsSync(snapshotPath) || fs.statSync(snapshotPath).size === 0) {
      throw new Error(`Snapshot missing or empty at: ${snapshotPath}`);
    }
    console.log(`>>> SUCCESS: Snapshot verified at ${snapshotPath} (${fs.statSync(snapshotPath).size} bytes)`);

    const receiptPath = path.join(repoRoot, relEvidenceReceipt);
    if (fs.existsSync(receiptPath)) {
      console.log(`>>> SUCCESS: Receipt verified at ${receiptPath}`);
    }

    console.log('>>> STAGE 9 LIVE BRIDGE E2E: PASSED SUCCESSFULLY');
    process.exit(0);
  } catch (err) {
    console.error('>>> Engine execution failed:', err);
    process.exit(1);
  }
})();

