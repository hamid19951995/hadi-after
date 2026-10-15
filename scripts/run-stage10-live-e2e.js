const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { runJob } = require('../src/engine/engine');

async function main() {
    const repoRoot = path.resolve(__dirname, '..');
    const manifestPath = path.join(repoRoot, 'manifests', 'stage10-manifest.json');

    console.log('[Stage 10] Loading manifest and starting live render E2E job...');

    const manifestRaw = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestRaw);

    const job = {
        schemaVersion: manifest.schemaVersion,
        jobId: manifest.jobId,
        opId: 'op-stage10-' + Date.now(),
        stage: 'stage10-render',
        createdAt: new Date().toISOString(),
        issuer: 'system-e2e',
        policy: {
            mode: 'strict',
            retries: 2,
            timeouts: { globalMs: 240000, stepMs: 180000, verificationMs: 30000 }
        },
        inputs: {},
        inputHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        description: manifest.description,
        manifestRef: 'manifests/stage10-manifest.json',
        steps: manifest.steps,
        expectedState: null,
        evidencePath: 'evidence/ae/job-stage10-render-001/receipt.json'
    };

    const evidenceDir = path.join(repoRoot, 'evidence', 'ae', 'job-stage10-render-001');
    if (!fs.existsSync(evidenceDir)) {
        fs.mkdirSync(evidenceDir, { recursive: true });
    }

    const aePath = 'C:\\Program Files\\Adobe\\Adobe After Effects 2026\\Support Files\\AfterFX.exe';
    const runnerJsx = path.join(repoRoot, 'scripts', 'stage10-bridge-live-runner.jsx');

    console.log('[Stage 10] Spawning After Effects bridge runner...');

    if (!fs.existsSync(aePath)) {
        console.error('[Stage 10] After Effects executable not found at', aePath);
        console.error('[Stage 10] Aborting E2E run - ensure After Effects is installed at the configured path.');
        process.exit(1);
    }

    // Spawn AfterFX explicitly. Keep child attached so we observe its lifecycle; capture stdout/stderr to a log file for diagnostics
    const spawnLogDir = path.join(repoRoot, 'evidence', 'ae');
    try { fs.mkdirSync(spawnLogDir, { recursive: true }); } catch (e) {}
    const spawnLogPath = path.join(spawnLogDir, 'ae-spawn.log');
    const spawnLog = fs.createWriteStream(spawnLogPath, { flags: 'a', encoding: 'utf8' });

    const aeProcess = spawn(aePath, ['-noui', '-r', runnerJsx], {
        detached: false,
        stdio: ['ignore', 'pipe', 'pipe']
    });

    aeProcess.stdout && aeProcess.stdout.on('data', (chunk) => { try { spawnLog.write('[AE STDOUT] ' + String(chunk)); } catch (e) {} });
    aeProcess.stderr && aeProcess.stderr.on('data', (chunk) => { try { spawnLog.write('[AE STDERR] ' + String(chunk)); } catch (e) {} });
    aeProcess.on('exit', (code, signal) => { try { spawnLog.write('[AE EXIT] code=' + code + ' signal=' + signal + ' ts=' + new Date().toISOString() + '\n'); } catch (e) {} });

    // Allow a larger initial delay for AE startup before polling the outbox, prefer ready-file waiting
    const receipt = await runJob(job, {
        workspaceRoot: repoRoot,
        bridgeOptions: {
            repoRoot,
            maxWaitMs: 180000,
            initialDelayMs: 2000,
            waitReadyFileMs: 10000
        }
    });

    try { spawnLog.end(); } catch (e) {}

    console.log('[Stage 10] Job completed with status:', receipt.status);
    console.log(JSON.stringify(receipt, null, 2));
}

main().catch(err => {
    console.error('[Stage 10] Fatal error:', err);
    process.exit(1);
});
