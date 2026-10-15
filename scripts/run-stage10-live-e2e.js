const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { runJob } = require('../src/engine/engine');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function waitForFile(filePath, timeoutMs) {
    return new Promise((resolve, reject) => {
        const startedAt = Date.now();

        const timer = setInterval(() => {
            if (fs.existsSync(filePath)) {
                clearInterval(timer);
                resolve();
                return;
            }

            if (Date.now() - startedAt >= timeoutMs) {
                clearInterval(timer);
                reject(new Error(
                    `Timed out waiting for bridge request: ${filePath}`
                ));
            }
        }, 100);
    });
}

function waitForRequestOrJobFailure(requestPath, receiptPromise, timeoutMs) {
    const requestReady = waitForFile(requestPath, timeoutMs);

    const jobFinishedBeforeRequest = receiptPromise.then(
        () => {
            throw new Error(
                'runJob completed before bridge request was created'
            );
        },
        error => {
            throw error;
        }
    );

    return Promise.race([
        requestReady,
        jobFinishedBeforeRequest
    ]);
}

async function main() {
    const repoRoot = path.resolve(__dirname, '..');
    const manifestPath = path.join(
        repoRoot,
        'manifests',
        'stage10-manifest.json'
    );

    const inboxFile = path.join(
        repoRoot,
        'bridge',
        'inbox',
        'current.request.json'
    );

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
            timeouts: {
                globalMs: 240000,
                stepMs: 180000,
                verificationMs: 30000
            }
        },
        inputs: {},
        inputHash:
            'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        description: manifest.description,
        manifestRef: 'manifests/stage10-manifest.json',
        steps: manifest.steps,
        expectedState: null,
        evidencePath:
            'evidence/ae/job-stage10-render-001/receipt.json'
    };

    const evidenceDir = path.join(
        repoRoot,
        'evidence',
        'ae',
        'job-stage10-render-001'
    );

    fs.mkdirSync(evidenceDir, { recursive: true });

    const aePath =
        'C:\\Program Files\\Adobe\\Adobe After Effects 2026\\Support Files\\AfterFX.exe';

    const runnerJsx = path.join(
        repoRoot,
        'scripts',
        'stage10-bridge-live-runner.jsx'
    );

    if (!fs.existsSync(aePath)) {
        throw new Error(
            `After Effects executable not found at: ${aePath}`
        );
    }

    if (!fs.existsSync(runnerJsx)) {
        throw new Error(`Stage 10 JSX runner not found at: ${runnerJsx}`);
    }

    const spawnLogDir = path.join(repoRoot, 'evidence', 'ae');
    fs.mkdirSync(spawnLogDir, { recursive: true });

    const spawnLogPath = path.join(spawnLogDir, 'ae-spawn.log');
    const spawnLog = fs.createWriteStream(spawnLogPath, {
        flags: 'a',
        encoding: 'utf8'
    });

    let aeProcess = null;

    try {
        console.log('[Stage 10] Starting bridge job and waiting for inbox request...');

        // runJob creates bridge/inbox/current.request.json.
        // AfterFX must start only after that file exists.
        const receiptPromise = runJob(job, {
            workspaceRoot: repoRoot,
            bridgeOptions: {
                repoRoot,
                maxWaitMs: 180000,
                initialDelayMs: 2000,
                waitReadyFileMs: 10000
            }
        });

        await waitForRequestOrJobFailure(
            inboxFile,
            receiptPromise,
            30000
        );

        console.log(
            '[Stage 10] Inbox request detected. Spawning After Effects bridge runner...'
        );

        aeProcess = spawn(aePath, ['-noui', '-r', runnerJsx], {
            detached: false,
            stdio: ['ignore', 'pipe', 'pipe']
        });

        aeProcess.stdout.on('data', chunk => {
            spawnLog.write('[AE STDOUT] ' + String(chunk));
        });

        aeProcess.stderr.on('data', chunk => {
            spawnLog.write('[AE STDERR] ' + String(chunk));
        });

        aeProcess.on('error', error => {
            spawnLog.write(
                '[AE ERROR] ' +
                error.message +
                ' ts=' +
                new Date().toISOString() +
                '\n'
            );
        });

        aeProcess.on('exit', (code, signal) => {
            spawnLog.write(
                '[AE EXIT] code=' +
                code +
                ' signal=' +
                signal +
                ' ts=' +
                new Date().toISOString() +
                '\n'
            );
        });

        const receipt = await receiptPromise;

        console.log('[Stage 10] Job completed with status:', receipt.status);
        console.log(JSON.stringify(receipt, null, 2));
    } finally {
        try {
            spawnLog.end();
        } catch (error) {
            // Diagnostic logging must not mask the actual job result.
        }
    }
}

main().catch(error => {
    console.error('[Stage 10] Fatal error:', error);
    process.exit(1);
});
