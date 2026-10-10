'use strict';

const fs = require('fs');
const path = require('path');

function round(value) {
  return Number(value.toFixed(8));
}

function percentile(sorted, fraction) {
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)];
}

function summarize(name, samplesMsPerOperation, details) {
  if (!samplesMsPerOperation.length || samplesMsPerOperation.some(value => !Number.isFinite(value))) {
    throw new Error(`Cannot summarize invalid samples for ${name}`);
  }

  const sorted = samplesMsPerOperation.slice().sort((left, right) => left - right);
  const mean = sorted.reduce((total, value) => total + value, 0) / sorted.length;
  return {
    name,
    unit: 'ms/operation',
    samples: sorted.length,
    warmupRounds: details.warmupRounds,
    operationsPerRound: details.operationsPerRound,
    min: round(sorted[0]),
    median: round(percentile(sorted, 0.5)),
    p95: round(percentile(sorted, 0.95)),
    mean: round(mean),
    max: round(sorted[sorted.length - 1])
  };
}

function writeMetrics(metrics, targetPath) {
  if (!targetPath) return null;

  const absolutePath = path.resolve(targetPath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  const fileDescriptor = fs.openSync(absolutePath, 'wx');
  try {
    fs.writeFileSync(fileDescriptor, `${JSON.stringify(metrics, null, 2)}\n`, 'utf8');
  } finally {
    fs.closeSync(fileDescriptor);
  }
  return absolutePath;
}

module.exports = { summarize, writeMetrics };