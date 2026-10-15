#!/usr/bin/env node
'use strict';

const path = require('node:path');
const fs = require('node:fs');
const { runJob } = require('../src/engine/engine');

(async function main(){
  const repoRoot = process.cwd();
  const manifestPath = path.join(repoRoot, 'manifests', 'stage11-manifest.json');
  if (!fs.existsSync(manifestPath)){
    console.error('[stage11] Manifest not found:', manifestPath);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  const job = {
    jobId: manifest.jobId || `job-stage11-batch-${Date.now()}`,
    opId: `op-stage11-${Date.now()}`,
    stage: 'stage11-batch',
    createdAt: new Date().toISOString(),
    issuer: 'stage11-runner',
    policy: { retries: 0, timeouts: { stepMs: 1000, verificationMs: 5000 } },
    manifestRef: path.relative(repoRoot, manifestPath).replace(/\\/g, '/'),
    inputs: {},
    inputHash: 'sim-batch-input',
    steps: manifest.steps,
    expectedState: null,
    evidencePath: path.join('evidence','ae', manifest.jobId, 'receipt.json')
  };

  console.log('[stage11] Starting batch job:', job.jobId);

  const receipt = await runJob(job, {
    workspaceRoot: repoRoot,
    bridgeOptions: {
      repoRoot,
      initialDelayMs: 5000,
      maxWaitMs: 120000
    }
  });

  console.log('[stage11] Job completed with status:', receipt.status);
  console.log(JSON.stringify(receipt, null, 2));

  process.exit(receipt.status === 'verified' || receipt.status === 'succeeded' ? 0 : 2);
})();
