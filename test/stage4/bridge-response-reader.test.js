'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { BridgeResponseReader, parseBridgeResponse } = require('../../src/engine/bridge_response_reader');

const TMP_TEST_DIR = path.resolve(__dirname, '..', '.tmp-stage4-response-test');

test.beforeEach(() => {
  if (fs.existsSync(TMP_TEST_DIR)) {
    fs.rmSync(TMP_TEST_DIR, { recursive: true, force: true });
  }
});

test.after(() => {
  if (fs.existsSync(TMP_TEST_DIR)) {
    fs.rmSync(TMP_TEST_DIR, { recursive: true, force: true });
  }
});

test('parseBridgeResponse: validates and normalizes successful response', () => {
  const raw = JSON.stringify({
    responseVersion: '1.0.0',
    jobId: 'job-123',
    requestId: 'req-abc',
    status: 'succeeded',
    durationMs: 450,
    stepResults: [{ id: 'step-1', status: 'done' }]
  });

  const parsed = parseBridgeResponse(raw, 'job-123', 'req-abc');
  assert.equal(parsed.status, 'succeeded');
  assert.equal(parsed.stepResults.length, 1);
  assert.equal(parsed.errors.length, 0);
});

test('parseBridgeResponse: detects jobId mismatch', () => {
  const raw = JSON.stringify({
    responseVersion: '1.0.0',
    jobId: 'job-other',
    status: 'succeeded'
  });

  assert.throws(() => {
    parseBridgeResponse(raw, 'job-expected');
  }, /Bridge response jobId mismatch/);
});

test('BridgeResponseReader: reads response and can consume file', () => {
  const reader = new BridgeResponseReader({ repoRoot: TMP_TEST_DIR });
  assert.equal(reader.hasResponse(), false);
  assert.equal(reader.readResponse(), null);

  fs.mkdirSync(reader.outboxDir, { recursive: true });
  const payload = {
    responseVersion: '1.0.0',
    jobId: 'job-consumer',
    status: 'succeeded'
  };
  fs.writeFileSync(reader.responseFilePath, JSON.stringify(payload));

  assert.equal(reader.hasResponse(), true);
  const res = reader.readResponse({ expectedJobId: 'job-consumer', consume: true });
  assert.equal(res.status, 'succeeded');
  assert.equal(reader.hasResponse(), false);
});
