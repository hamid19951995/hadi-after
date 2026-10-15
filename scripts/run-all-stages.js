const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function runStep(name, cmd, args, cwd) {
  const start = Date.now();
  const res = spawnSync(cmd, args, { cwd: cwd || process.cwd(), encoding: 'utf8' });
  const end = Date.now();
  const entry = {
    name,
    startTime: new Date(start).toISOString(),
    endTime: new Date(end).toISOString(),
    durationMs: end - start,
    status: res.status === 0 ? 'passed' : 'failed',
    exitCode: res.status,
    stdout: res.stdout || '',
    stderr: res.stderr || ''
  };
  return entry;
}

(async function main() {
  const repoRoot = process.cwd();
  const report = { stages: [], completedAt: null, durationMs: 0, receipts: {} };
  const start = Date.now();

  // Stage 3 tests
  report.stages.push(runStep('stage-3-unit-tests', 'node', ['test/job-schema.test.js']));
  report.stages.push(runStep('stage-3-engine-happy', 'node', ['test/engine-happy-path.test.js']));
  report.stages.push(runStep('stage-3-engine-negative', 'node', ['test/engine-negative-invalid-job.test.js']));

  // Stage 10 simulation
  report.stages.push(runStep('stage-10-sim', 'node', ['test/simulate-stage10-bridge.js']));

  // Stage 11 simulation
  report.stages.push(runStep('stage-11-sim', 'node', ['test/simulate-stage11-batch.js']));

  // Collect receipts
  const evidenceAeDir = path.join(repoRoot, 'evidence', 'ae');
  if (fs.existsSync(evidenceAeDir)) {
    const walk = (dir) => {
      const files = fs.readdirSync(dir, { withFileTypes: true });
      for (const f of files) {
        const full = path.join(dir, f.name);
        if (f.isDirectory()) walk(full);
        if (f.isFile() && f.name === 'receipt.json') {
          const rel = path.relative(repoRoot, full);
          try {
            report.receipts[rel] = fs.readFileSync(full, 'utf8');
          } catch (e) {
            report.receipts[rel] = `ERROR: ${String(e)}`;
          }
        }
      }
    };
    walk(evidenceAeDir);
  }

  report.completedAt = new Date().toISOString();
  report.durationMs = Date.now() - start;

  // Ensure output dir
  const outDir = path.join(repoRoot, 'evidence', 'pipeline');
  fs.mkdirSync(outDir, { recursive: true });
  const reportPath = path.join(outDir, `health-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  console.log('Health report written to', reportPath);
  for (const s of report.stages) {
    console.log(s.name, s.status, `${s.durationMs}ms`);
  }

  const anyFailed = report.stages.some(s => s.status !== 'passed');
  process.exit(anyFailed ? 2 : 0);
})();
