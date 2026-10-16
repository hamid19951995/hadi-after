#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { runJob } = require('../src/engine/engine');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fileExists(p) {
  try { return fs.existsSync(p); } catch (e) { return false; }
}

(async function main() {
  const repoRoot = process.cwd();

  const aePath =
    'C:\\Program Files\\Adobe\\Adobe After Effects 2026\\Support Files\\AfterFX.exe';

  const runnerJsx = path.join(repoRoot, 'scripts', 'stage11-bridge-batch-runner.jsx');

  const manifestPath = path.join(repoRoot, 'manifests', 'stage11-manifest.json');
  if (!fileExists(manifestPath)) {
    console.error('[stage11-live] Manifest not found:', manifestPath);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  const job = {
    jobId: manifest.jobId || `job-stage11-batch-${Date.now()}`,
    opId: `op-stage11-${Date.now()}`,
    stage: 'stage11-batch',
    createdAt: new Date().toISOString(),
    issuer: 'stage11-live-runner',
    policy: { retries: 0, timeouts: { stepMs: 1000, verificationMs: 5000 } },
    manifestRef: path.relative(repoRoot, manifestPath).replace(/\\/g, '/'),
    inputs: {},
    inputHash: 'sim-batch-input',
    steps: manifest.steps,
    expectedState: null,
    evidencePath: path.join('evidence', 'ae', manifest.jobId, 'receipt.json')
  };

  const spawnLogDir = path.join(repoRoot, 'evidence', 'ae');
  fs.mkdirSync(spawnLogDir, { recursive: true });
  const spawnLogPath = path.join(spawnLogDir, 'ae-spawn-stage11.log');
  const spawnLog = fs.createWriteStream(spawnLogPath, { flags: 'a', encoding: 'utf8' });

  const inboxPath = path.join(repoRoot, 'bridge', 'inbox', 'current.request.json');

  let jobFinished = false;
  let activeAeProcess = null;

  try {
    console.log('[stage11-live] Starting live batch job:', job.jobId);

    const receiptPromise = runJob(job, {
      workspaceRoot: repoRoot,
      bridgeOptions: {
        repoRoot,
        initialDelayMs: 2000,
        maxWaitMs: 120000
      }
    }).then(receipt => {
      jobFinished = true;
      return receipt;
    }).catch(err => {
      jobFinished = true;
      throw err;
    });

    // Worker loop: monitors inbox and triggers AE whenever an inbox request is unserved
    (async () => {
      let lastHandledRequest = null;
      while (!jobFinished) {
        if (fileExists(inboxPath)) {
          let reqData = null;
          try {
            reqData = JSON.parse(fs.readFileSync(inboxPath, 'utf8'));
          } catch (e) {}

          const reqId = reqData ? (reqData.requestId || reqData.jobId + '-' + (reqData.actions?.[0]?.actionId || 'act')) : null;

          if (reqId && reqId !== lastHandledRequest) {
            lastHandledRequest = reqId;
            console.log(`[stage11-live] Inbox request detected (${reqId}). Spawning After Effects...`);
            spawnLog.write(`[SPAWN] ts=${new Date().toISOString()} req=${reqId} cmd=${aePath} -noui -r ${runnerJsx}\n`);

            await new Promise(resolveAe => {
              activeAeProcess = spawn(aePath, ['-noui', '-r', runnerJsx], {
                cwd: repoRoot,
                detached: false,
                stdio: ['ignore', 'pipe', 'pipe']
              });

              activeAeProcess.stdout.on('data', chunk => spawnLog.write('[AE STDOUT] ' + String(chunk)));
              activeAeProcess.stderr.on('data', chunk => spawnLog.write('[AE STDERR] ' + String(chunk)));

              activeAeProcess.on('exit', (code, signal) => {
                spawnLog.write(`[AE EXIT] code=${code} signal=${signal} ts=${new Date().toISOString()}\n`);
                activeAeProcess = null;
                resolveAe();
              });

              activeAeProcess.on('error', error => {
                spawnLog.write(`[AE ERROR] ${error.message} ts=${new Date().toISOString()}\n`);
                activeAeProcess = null;
                resolveAe();
              });
            });
          }
        }
        await sleep(500);
      }
    })();

    const receipt = await receiptPromise;

    console.log('[stage11-live] Job completed with status:', receipt.status);
    console.log(JSON.stringify(receipt, null, 2));

    process.exit(receipt.status === 'verified' || receipt.status === 'succeeded' ? 0 : 2);
  } catch (err) {
    console.error(String(err && err.stack ? err.stack : err));
    process.exit(2);
  } finally {
    try { spawnLog.end(); } catch (e) {}
    try {
      if (activeAeProcess && !activeAeProcess.killed) {
        activeAeProcess.kill();
      }
    } catch (e) {}
  }
})();