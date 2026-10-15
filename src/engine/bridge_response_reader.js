'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_OUTBOX_SUBDIR = path.join('bridge', 'outbox');
const CURRENT_RESPONSE_FILENAME = 'current.response.json';

const VALID_STATUSES = new Set(['succeeded', 'failed', 'cancelled']);

function parseBridgeResponse(rawJson, expectedJobId = null, expectedRequestId = null) {
  if (typeof rawJson !== 'string' || !rawJson.trim()) {
    throw new Error('Bridge response content is empty or invalid string');
  }

  let data;
  try {
    data = JSON.parse(rawJson);
  } catch (err) {
    throw new Error(`Failed to parse bridge response JSON: ${err.message}`);
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Bridge response must be a JSON object');
  }

  if (!data.responseVersion || typeof data.responseVersion !== 'string') {
    throw new Error('Bridge response missing or invalid "responseVersion"');
  }

  if (!data.jobId || typeof data.jobId !== 'string') {
    throw new Error('Bridge response missing or invalid "jobId"');
  }

  if (expectedJobId && data.jobId !== expectedJobId) {
    throw new Error(`Bridge response jobId mismatch: expected "${expectedJobId}", got "${data.jobId}"`);
  }

  if (expectedRequestId && data.requestId && data.requestId !== expectedRequestId) {
    throw new Error(`Bridge response requestId mismatch: expected "${expectedRequestId}", got "${data.requestId}"`);
  }

  if (!data.status || !VALID_STATUSES.has(data.status)) {
    throw new Error(`Bridge response status must be one of: ${[...VALID_STATUSES].join(', ')}; got "${data.status}"`);
  }

  return {
    responseVersion: data.responseVersion,
    jobId: data.jobId,
    requestId: data.requestId || null,
    status: data.status,
    completedAt: data.completedAt || new Date().toISOString(),
    durationMs: typeof data.durationMs === 'number' ? data.durationMs : null,
    stepResults: Array.isArray(data.stepResults) ? data.stepResults : [],
    errors: Array.isArray(data.errors) ? data.errors : (data.error ? [data.error] : []),
    outputFiles: Array.isArray(data.outputFiles) ? data.outputFiles : []
  };
}

class BridgeResponseReader {
  constructor({ repoRoot, outboxSubdir = DEFAULT_OUTBOX_SUBDIR, responseFilename = CURRENT_RESPONSE_FILENAME } = {}) {
    if (!repoRoot || typeof repoRoot !== 'string') {
      throw new Error('repoRoot is required and must be a string path');
    }
    this.repoRoot = path.resolve(repoRoot);
    this.outboxDir = path.join(this.repoRoot, outboxSubdir);
    this.responseFilePath = path.join(this.outboxDir, responseFilename);
  }

  hasResponse() {
    return fs.existsSync(this.responseFilePath);
  }

  readResponse({ expectedJobId = null, expectedRequestId = null, consume = false } = {}) {
    if (!this.hasResponse()) {
      return null;
    }

    const content = fs.readFileSync(this.responseFilePath, 'utf8');

    // If the file exists but is empty (e.g., AE created the file before writing), treat as not-yet-ready
    if (typeof content !== 'string' || !content.trim()) {
      return null;
    }

    const parsed = parseBridgeResponse(content, expectedJobId, expectedRequestId);

    if (consume) {
      fs.rmSync(this.responseFilePath, { force: true });
    }

    return parsed;
  }
}

module.exports = {
  BridgeResponseReader,
  parseBridgeResponse,
  DEFAULT_OUTBOX_SUBDIR,
  CURRENT_RESPONSE_FILENAME
};
