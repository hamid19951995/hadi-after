"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const assert = require("assert");

// Offline-first asset downloader. Network fetchers must be explicitly supplied.
// cacheDir must be inside repository workspace and under control.
class AssetDownloader {
  constructor(opts = {}) {
    assert(opts.cacheDir, "cacheDir required");
    this.cacheDir = path.resolve(opts.cacheDir);
    this.workspaceRoot = opts.workspaceRoot ? path.resolve(opts.workspaceRoot) : process.cwd();
    this.offline = !!opts.offline;
    this.allowlist = Array.isArray(opts.allowlist) ? opts.allowlist.slice() : [];
    this.fetcher = typeof opts.fetcher === 'function' ? opts.fetcher : null; // async function(url)->{ buffer, contentType }
    this.maxSizeBytes = typeof opts.maxSizeBytes === 'number' ? opts.maxSizeBytes : 20 * 1024 * 1024; // 20MB default

    // ensure cache dir exists and is sandboxed inside workspace
    try { fs.mkdirSync(this.cacheDir, { recursive: true }); } catch (e) { /* ignore */ }
    const realCache = fs.realpathSync(this.cacheDir);
    const realRoot = fs.realpathSync(this.workspaceRoot);
    if (!this._isPathInside(realCache, realRoot)) throw new Error('cacheDir must be inside the workspace root');
    // protect against symlink attacks: cacheDir should not resolve outside workspace
    this.cacheReal = realCache;
  }

  // deterministic file name for a URL or id
  filenameForId(id) {
    const h = crypto.createHash("sha256").update(String(id), "utf8").digest("hex");
    return path.join(this.cacheReal, h);
  }

  _isPathInside(child, parent) {
    const c = path.resolve(child) + path.sep;
    const p = path.resolve(parent) + path.sep;
    return c.indexOf(p) === 0;
  }

  _domainAllowed(url) {
    try {
      const u = new URL(String(url));
      const host = u.hostname.toLowerCase();
      if (!this.allowlist || this.allowlist.length === 0) return false; // conservative
      return this.allowlist.some(allowed => host === allowed.toLowerCase() || host.endsWith('.' + allowed.toLowerCase()));
    } catch (e) { return false; }
  }

  // returns { status: 'CACHED'|'OFFLINE_GRACEFUL_SKIP'|'DISALLOWED_DOMAIN'|'FETCH_ERROR'|'STORED', path, message }
  async getAssetById(id) {
    const fp = this.filenameForId(id);
    if (fs.existsSync(fp)) return { status: "CACHED", path: fp };
    if (this.offline) return { status: "OFFLINE_GRACEFUL_SKIP" };
    // If id looks like a URL, check allowlist
    if (/^https?:\/\//i.test(String(id))) {
      if (!this._domainAllowed(id)) return { status: "DISALLOWED_DOMAIN", message: "domain is not allowlisted" };
      if (!this.fetcher) return { status: "OFFLINE_GRACEFUL_SKIP" };
      try {
        const fetched = await this.fetcher(String(id));
        if (!fetched || !fetched.buffer) return { status: "FETCH_ERROR", message: "empty response" };
        if (Buffer.byteLength(fetched.buffer) > this.maxSizeBytes) return { status: "FETCH_ERROR", message: "asset exceeds maxSizeBytes" };
        const stored = await this.storeAsset(id, fetched.buffer);
        return stored;
      } catch (err) {
        return { status: "FETCH_ERROR", message: String(err && err.message || err) };
      }
    }
    return { status: "OFFLINE_GRACEFUL_SKIP" };
  }

  // store buffer deterministically and protect against symlink traversal
  async storeAsset(id, buffer) {
    const fp = this.filenameForId(id);
    const dir = path.dirname(fp);
    try { fs.mkdirSync(dir, { recursive: true }); } catch (e) { }
    // write to temp then fsync rename
    const tmp = fp + '.tmp';
    fs.writeFileSync(tmp, buffer);
    // verify size
    const stats = fs.statSync(tmp);
    if (stats.size > this.maxSizeBytes) { fs.unlinkSync(tmp); throw new Error('asset too large'); }
    // resolve realpath of target directory to ensure it's inside workspace
    const realTargetDir = fs.realpathSync(dir);
    const realRoot = this.cacheReal; // real workspace/cache root
    if (!this._isPathInside(realTargetDir, realRoot)) { fs.unlinkSync(tmp); throw new Error('cache path is outside workspace (symlink?)'); }
    fs.renameSync(tmp, fp);
    return { status: 'STORED', path: fp };
  }
}

module.exports = { AssetDownloader };