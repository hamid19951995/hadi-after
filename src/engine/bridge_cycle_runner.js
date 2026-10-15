'use strict';

const path = require('node:path');

const { BridgeLockManager } = require('./bridge_lock_manager');
const { BridgeResponseReader } = require('./bridge_response_reader');
const { buildBridgeRequest } = require('./bridge_request_builder');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class BridgeCycleRunner {
  constructor({
    repoRoot,
    pollIntervalMs = 250,
    maxWaitMs = 60_000,
    consumeResponse = true,
    initialDelayMs = 3000,
    waitReadyFileMs = 0
  } = {}) {
    if (!repoRoot || typeof repoRoot !== 'string') {
      throw new Error('repoRoot is required and must be a string path');
    }
    this.repoRoot = path.resolve(repoRoot);
    this.pollIntervalMs = pollIntervalMs;
    this.maxWaitMs = maxWaitMs;
    this.consumeResponse = consumeResponse;

    this.lockManager = new BridgeLockManager({ repoRoot: this.repoRoot });
    this.responseReader = new BridgeResponseReader({ repoRoot: this.repoRoot });
    this.initialDelayMs = initialDelayMs;
    this.waitReadyFileMs = waitReadyFileMs;
    this.readyFileRelativePath = 'bridge/ready/ae.ready';
  }

  async runOnce(job, { forceReclaimIfStale = true, correlationId = null, initialDelayMs = null, waitReadyFileMs = null } = {}) {
    if (!job || typeof job !== 'object') throw new Error('job is required');
    if (!job.jobId || typeof job.jobId !== 'string') throw new Error('job.jobId is required');

    const lock = this.lockManager.acquire({ jobId: job.jobId, forceReclaimIfStale });
    if (!lock.acquired) {
      return { ok: false, code: 'BRIDGE_LOCKED', lock };
    }

    try {
      // MUST match Stage4 builder signature
      const requestInfo = buildBridgeRequest({ job, repoRoot: this.repoRoot, correlationId });

      // If configured, wait for AE runtime to write a readiness touch-file before proceeding (preferred)
      const waitReadyMs = waitReadyFileMs !== null ? waitReadyFileMs : this.waitReadyFileMs || 0;
      if (waitReadyMs > 0) {
        const readyFile = path.join(this.repoRoot, this.readyFileRelativePath);
        const waitStarted = Date.now();
        while (Date.now() - waitStarted < waitReadyMs) {
          if (require('fs').existsSync(readyFile)) {
            break;
          }
          await sleep(Math.min(500, waitReadyMs));
        }
      }

      // Allow an initial startup grace period for After Effects to launch and run the JSX (fallback)
      const startupDelay = initialDelayMs !== null ? initialDelayMs : this.initialDelayMs || 3000;
      if (startupDelay > 0) {
        await sleep(startupDelay);
      }

      const started = Date.now();
      while (Date.now() - started < this.maxWaitMs) {
        const res = this.responseReader.readResponse({
          expectedJobId: job.jobId,
          expectedRequestId: requestInfo.requestId || null,
          consume: this.consumeResponse
        });

        if (res) {
          return { ok: true, request: requestInfo, response: res };
        }

        await sleep(this.pollIntervalMs);
      }

      return { ok: false, code: 'BRIDGE_TIMEOUT', request: requestInfo };
    } finally {
      this.lockManager.release({ jobId: job.jobId, force: true });
    }
  }
}

module.exports = { BridgeCycleRunner };
