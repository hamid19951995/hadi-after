'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { validateJobOrThrow } = require('./job_validate');

const DEFAULT_INBOX_SUBDIR = path.join('bridge', 'inbox');
const CURRENT_REQUEST_FILENAME = 'current.request.json';

/**
 * Builds and atomics-writes a bridge request for AE host execution.
 *
 * @param {object} params
 * @param {object} params.job - Valid Stage 3 job envelope.
 * @param {string} params.repoRoot - Absolute or relative path to repo root.
 * @param {string} [params.correlationId] - Optional correlation ID; generated if missing.
 * @returns {{ request: object, requestFilePath: string, evidenceDir: string }}
 */
function buildBridgeRequest({ job, repoRoot, correlationId }) {
  if (!repoRoot || typeof repoRoot !== 'string') {
    throw new Error('repoRoot is required and must be a string path');
  }

  // 1) Authoritative Stage 3 validation (no secondary contract)
  validateJobOrThrow(job);

  const resolvedRepoRoot = path.resolve(repoRoot);

  // 2) Sandboxing: evidencePath must reside inside <repoRoot>/evidence/ae/<jobId>/
  const expectedEvidenceSubdir = path.join('evidence', 'ae', job.jobId);
  const allowedEvidenceRoot = path.resolve(resolvedRepoRoot, expectedEvidenceSubdir);
  const absoluteEvidencePath = path.resolve(resolvedRepoRoot, job.evidencePath);

  const rel = path.relative(allowedEvidenceRoot, absoluteEvidencePath);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(
      `Security/Sandbox violation: evidencePath "${job.evidencePath}" must reside strictly inside "${expectedEvidenceSubdir}"`
    );
  }

  // 3) Transform steps[] -> actions[] preserving order exactly
  const actions = job.steps.map((step, index) => ({
    actionId: step.stepId || `action-${index + 1}`,
    type: step.type,
    runScript: step.runScript ? { ...step.runScript } : undefined,
    expectedState: step.expectedState ? { ...step.expectedState } : undefined,
    params: step.params ? { ...step.params } : {}
  }));

  const cid = correlationId || crypto.randomUUID();

  // 4) Bridge request envelope (transport-level, derived)
  const request = {
    bridgeVersion: '1.0.0',
    correlationId: cid,
    jobId: job.jobId,
    opId: job.opId,
    stage: job.stage,
    inputHash: job.inputHash,
    actions,
    evidenceDir: expectedEvidenceSubdir.replace(/\\/g, '/'),
    createdAt: new Date().toISOString()
  };

  // 5) Ensure required dirs exist
  const inboxDir = path.resolve(resolvedRepoRoot, DEFAULT_INBOX_SUBDIR);
  fs.mkdirSync(inboxDir, { recursive: true });
  fs.mkdirSync(allowedEvidenceRoot, { recursive: true });

  // 6) Atomic write: tmp then rename into place
  const requestFilePath = path.join(inboxDir, CURRENT_REQUEST_FILENAME);
  const tempFilePath = path.join(inboxDir, `${CURRENT_REQUEST_FILENAME}.${cid}.tmp`);

  fs.writeFileSync(tempFilePath, JSON.stringify(request, null, 2), 'utf8');
  fs.renameSync(tempFilePath, requestFilePath);

  return {
    request,
    requestFilePath,
    evidenceDir: allowedEvidenceRoot
  };
}

module.exports = {
  buildBridgeRequest,
  CURRENT_REQUEST_FILENAME,
  DEFAULT_INBOX_SUBDIR
};
