'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_LOCK_SUBDIR = path.join('bridge', 'locks');
const DEFAULT_LOCK_FILENAME = 'active.lock';
const DEFAULT_STALE_TIMEOUT_MS = 60000;

function isPidAlive(pid) {
  if (!pid || typeof pid !== 'number' || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === 'EPERM';
  }
}

class BridgeLockManager {
  constructor({ repoRoot, lockSubdir = DEFAULT_LOCK_SUBDIR, lockFilename = DEFAULT_LOCK_FILENAME, staleTimeoutMs = DEFAULT_STALE_TIMEOUT_MS } = {}) {
    if (!repoRoot || typeof repoRoot !== 'string') {
      throw new Error('repoRoot is required and must be a string path');
    }
    this.repoRoot = path.resolve(repoRoot);
    this.lockDir = path.join(this.repoRoot, lockSubdir);
    this.lockFilePath = path.join(this.lockDir, lockFilename);
    this.staleTimeoutMs = staleTimeoutMs;
  }

  acquire({ jobId, pid = process.pid, forceReclaimIfStale = true }) {
    if (!jobId || typeof jobId !== 'string') {
      throw new Error('jobId is required to acquire bridge lock');
    }

    fs.mkdirSync(this.lockDir, { recursive: true });

    const now = Date.now();
    const lockPayload = {
      lockVersion: '1.0.0',
      jobId,
      pid,
      startedAt: new Date(now).toISOString(),
      timestampMs: now
    };

    try {
      fs.writeFileSync(this.lockFilePath, JSON.stringify(lockPayload, null, 2), { flag: 'wx' });
      return { acquired: true, lock: lockPayload, reclaimed: false };
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;

      let currentLock = null;
      try {
        currentLock = JSON.parse(fs.readFileSync(this.lockFilePath, 'utf8'));
      } catch {
        currentLock = null;
      }

      if (forceReclaimIfStale) {
        const isOwnerAlive = currentLock && currentLock.pid ? isPidAlive(currentLock.pid) : false;
        const isTimeExpired = currentLock && currentLock.timestampMs ? (now - currentLock.timestampMs > this.staleTimeoutMs) : true;

        if (!isOwnerAlive || isTimeExpired) {
          fs.rmSync(this.lockFilePath, { force: true });
          fs.writeFileSync(this.lockFilePath, JSON.stringify(lockPayload, null, 2), { flag: 'wx' });
          return { acquired: true, lock: lockPayload, reclaimed: true, previousLock: currentLock };
        }
      }

      return {
        acquired: false,
        activeLock: currentLock,
        reason: 'BRIDGE_LOCKED_BY_ACTIVE_PROCESS'
      };
    }
  }

  release({ jobId, pid = process.pid, force = false } = {}) {
    if (!fs.existsSync(this.lockFilePath)) {
      return { released: true, note: 'NO_LOCK_PRESENT' };
    }

    try {
      const currentLock = JSON.parse(fs.readFileSync(this.lockFilePath, 'utf8'));
      if (!force) {
        if (jobId && currentLock.jobId !== jobId) {
          throw new Error(`Cannot release lock held by jobId "${currentLock.jobId}" (attempted by "${jobId}")`);
        }
        if (pid && currentLock.pid !== pid) {
          throw new Error(`Cannot release lock held by PID ${currentLock.pid} (attempted by PID ${pid})`);
        }
      }
    } catch (err) {
      if (!force && err.code !== 'ENOENT') throw err;
    }

    fs.rmSync(this.lockFilePath, { force: true });
    return { released: true };
  }
}

module.exports = {
  BridgeLockManager,
  DEFAULT_LOCK_SUBDIR,
  DEFAULT_LOCK_FILENAME,
  DEFAULT_STALE_TIMEOUT_MS
};
