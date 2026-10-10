'use strict';

const { buildProductionPlan, validateProductionPlan, fingerprintPlan } = require('./runtime/production-orchestrator');
const { createCheckpoint, restoreCheckpoint } = require('./recovery/checkpoint-store');
const { createCacheKey, CacheStore } = require('./cache/deterministic-cache');

module.exports = {
  version: '32.0.0',
  buildProductionPlan,
  validateProductionPlan,
  fingerprintPlan,
  createCheckpoint,
  restoreCheckpoint,
  createCacheKey,
  CacheStore
};
