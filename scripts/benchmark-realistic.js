'use strict';

const os = require('os');
const path = require('path');
const core = require('../runtime/offline-core');
const { summarize, writeMetrics } = require('./metrics');

const WARMUP_ROUNDS = 5;
const MEASUREMENT_ROUNDS = 25;
const FAST_OPERATIONS_PER_ROUND = 100;

function makeProjectFixture() {
  const compositions = [];
  for (let compositionIndex = 0; compositionIndex < 24; compositionIndex += 1) {
    const layers = [];
    for (let layerIndex = 0; layerIndex < 12; layerIndex += 1) {
      layers.push({
        id: `comp-${compositionIndex + 1}-layer-${layerIndex + 1}`,
        name: `Shot ${compositionIndex + 1} Element ${layerIndex + 1}`,
        type: ['text', 'footage', 'shape'][layerIndex % 3],
        start: layerIndex * 0.25,
        duration: 8 - layerIndex * 0.1,
        transform: { position: [960 + layerIndex, 540 - layerIndex], scale: [100, 100], opacity: 100 }
      });
    }
    compositions.push({
      id: `comp-${compositionIndex + 1}`,
      name: `Sequence ${String(compositionIndex + 1).padStart(2, '0')}`,
      width: 1920,
      height: 1080,
      frameRate: 30,
      duration: 8,
      layers
    });
  }
  return { schema: 'ae-project-benchmark.v1', projectName: 'Omega Product Launch', compositions };
}

function makeScenarios() {
  const context = {
    activeProject: 'Omega Product Launch',
    activeComposition: 'Sequence 01',
    selectedLayers: ['comp-1-layer-2'],
    lastComposition: 'Sequence 01',
    lastCreatedLayer: 'Title'
  };
  return [
    { request: 'Create composition 1920x1080 for 12 seconds at 30 fps', context },
    { request: 'Add text: Quarterly product launch', context },
    { request: 'Animate layer', context },
    { request: 'Render composition', context },
    { request: 'Inspect project', context }
  ];
}

function compileScenario(scenario) {
  const resolution = core.resolveIntent(scenario.request, scenario.context);
  const compiled = core.compilePlan(resolution, scenario.context);
  if (!compiled.ok || !compiled.fingerprint) throw new Error(`Scenario did not compile: ${scenario.request}`);
  return compiled;
}

function runBenchmark(name, operation, operationsPerRound, results) {
  let lastResult;
  for (let roundIndex = 0; roundIndex < WARMUP_ROUNDS; roundIndex += 1) {
    for (let operationIndex = 0; operationIndex < operationsPerRound; operationIndex += 1) {
      lastResult = operation(operationIndex);
    }
  }

  const samples = [];
  for (let roundIndex = 0; roundIndex < MEASUREMENT_ROUNDS; roundIndex += 1) {
    const started = process.hrtime.bigint();
    for (let operationIndex = 0; operationIndex < operationsPerRound; operationIndex += 1) {
      lastResult = operation(operationIndex);
    }
    const elapsedNanoseconds = Number(process.hrtime.bigint() - started);
    samples.push(elapsedNanoseconds / 1e6 / operationsPerRound);
  }
  if (!lastResult) throw new Error(`Benchmark produced no result: ${name}`);
  results.push(summarize(name, samples, { warmupRounds: WARMUP_ROUNDS, operationsPerRound }));
}

function main() {
  const project = makeProjectFixture();
  const scenarios = makeScenarios();
  const firstResolution = core.resolveIntent(scenarios[0].request, scenarios[0].context);
  const firstPlan = compileScenario(scenarios[0]);
  const checkpointPlan = compileScenario(scenarios[1]).plan;
  const completedSteps = Array.from({ length: 8 }, (_, index) => `step-${index + 1}`);
  const contextSnapshot = { project: 'Omega Product Launch', composition: 'Sequence 01', selectedLayerCount: 12 };
  const verificationResults = completedSteps.map(step => ({ step, ok: true }));
  const results = [];
  let scenarioIndex = 0;

  runBenchmark('stable:project-288-layers', () => core.stable(project), 1, results);
  runBenchmark('hash:project-288-layers', () => core.hash(project), 1, results);
  runBenchmark('resolveIntent:composition-request', () => core.resolveIntent(scenarios[0].request, scenarios[0].context), FAST_OPERATIONS_PER_ROUND, results);
  runBenchmark('compilePlan:composition-fingerprint', () => core.compilePlan(firstResolution, scenarios[0].context), FAST_OPERATIONS_PER_ROUND, results);
  runBenchmark('checkpoint:fingerprint-with-8-steps', () => core.checkpoint('benchmark-job-01', checkpointPlan, 'verify', completedSteps, contextSnapshot, verificationResults), FAST_OPERATIONS_PER_ROUND, results);
  runBenchmark('end-to-end:resolve-and-compile-5-request-types', () => {
    const scenario = scenarios[scenarioIndex % scenarios.length];
    scenarioIndex += 1;
    return compileScenario(scenario);
  }, FAST_OPERATIONS_PER_ROUND, results);

  const metrics = {
    schemaVersion: 1,
    benchmark: 'offline-core-realistic.v1',
    recordedAt: new Date().toISOString(),
    runtime: { node: process.version, platform: process.platform, architecture: process.arch },
    machine: { cpuModel: os.cpus()[0] && os.cpus()[0].model, logicalCpuCount: os.cpus().length },
    workload: {
      projectCompositions: project.compositions.length,
      layersPerComposition: 12,
      totalLayers: 288,
      requestTypes: scenarios.map(scenario => scenario.request),
      warmupRounds: WARMUP_ROUNDS,
      measurementRounds: MEASUREMENT_ROUNDS,
      fastOperationsPerRound: FAST_OPERATIONS_PER_ROUND,
      fingerprintSteps: ['stable serialization', 'hash', 'plan compilation fingerprint', 'checkpoint fingerprint'],
      limitations: 'Single-process local timings; CPU load, power state, OS scheduling, and Node/V8 version affect results. Compare runs on the same machine and runtime.'
    },
    results
  };

  console.log(`offline-core realistic benchmark | ${process.version} | ${process.platform}/${process.arch}`);
  console.log('Project fixture: 24 compositions x 12 layers = 288 layers; warm-up: 5 rounds; measured: 25 rounds.');
  console.log('Timings are milliseconds per operation; fast cases execute 100 operations per round.');
  for (const result of results) {
    console.log(`${result.name}: median ${result.median.toFixed(6)} ms/op, p95 ${result.p95.toFixed(6)} ms/op (min ${result.min.toFixed(6)}, max ${result.max.toFixed(6)})`);
  }

  const metricsPath = writeMetrics(metrics, process.env.METRICS_FILE);
  if (metricsPath) console.log(`Metrics JSON: ${path.relative(process.cwd(), metricsPath) || metricsPath}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}