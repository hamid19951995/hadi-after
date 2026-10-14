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
    this.ttlMs = typeof opts.ttlMs === 'number' ? opts.ttlMs : 24 * 60 * 60 * 1000; // 24h default
    this.maxFiles = typeof opts.maxFiles === 'number' ? opts.maxFiles : null; // no limit by default
    this.maxTotalBytes = typeof opts.maxTotalBytes === 'number' ? opts.maxTotalBytes : null; // no total size limit
    this.allowedContentTypes = Array.isArray(opts.allowedContentTypes) ? opts.allowedContentTypes.slice() : null; // null means allow all

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
    let ext = "";
    try {
      const parsed = new URL(String(id));
      ext = path.extname(parsed.pathname || "");
    } catch (e) {
      ext = path.extname(String(id));
    }
    if (!ext) ext = ".bin";
    return path.join(this.cacheReal, h + ext);
  }

  _metaPathFor(fp) {
    return fp + '.meta.json';
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

  _readMeta(fp) {
    try {
      const metaPath = this._metaPathFor(fp);
      if (!fs.existsSync(metaPath)) return null;
      const raw = fs.readFileSync(metaPath, 'utf8');
      return JSON.parse(raw);
    } catch (e) { return null; }
  }

  _writeMeta(fp, meta) {
    const metaPath = this._metaPathFor(fp);
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');
  }

  _removeFile(fp) {
    try { if (fs.existsSync(fp)) fs.unlinkSync(fp); } catch (e) {}
    try { const mp = this._metaPathFor(fp); if (fs.existsSync(mp)) fs.unlinkSync(mp); } catch (e) {}
  }

  async _enforceEviction() {
    // enforce maxFiles and maxTotalBytes by removing oldest entries
    const files = fs.readdirSync(this.cacheReal).filter(f => !f.endsWith('.meta.json'));
    const entries = [];
    let totalBytes = 0;
    for (const f of files) {
      const fp = path.join(this.cacheReal, f);
      try {
        const stats = fs.statSync(fp);
        const meta = this._readMeta(fp) || { at: stats.mtimeMs, size: stats.size };
        entries.push({ fp, at: meta.at || stats.mtimeMs, size: stats.size || meta.size || 0 });
        totalBytes += stats.size || 0;
      } catch (e) { }
    }
    // sort by access/creation time (oldest first)
    entries.sort((a,b) => (a.at||0) - (b.at||0));
    // Evict by count
    if (this.maxFiles && entries.length > this.maxFiles) {
      const toRemove = entries.length - this.maxFiles;
      for (let i=0;i<toRemove;i++) { this._removeFile(entries[i].fp); totalBytes -= entries[i].size; }
      entries.splice(0, toRemove);
    }
    // Evict by total bytes
    if (this.maxTotalBytes && totalBytes > this.maxTotalBytes) {
      for (let i=0;i<entries.length && totalBytes > this.maxTotalBytes;i++) {
        this._removeFile(entries[i].fp);
        totalBytes -= entries[i].size;
      }
    }
  }

  // returns { status: 'CACHED'|'OFFLINE_GRACEFUL_SKIP'|'DISALLOWED_DOMAIN'|'FETCH_ERROR'|'STORED'|'EXPIRED', path, message }
  async getAssetById(id) {
    const fp = this.filenameForId(id);
    const meta = this._readMeta(fp);
    // If id is a URL and domain not allowed for this downloader, reject even cached
    const isUrl = /^https?:\/\//i.test(String(id));
    if (isUrl && !this._domainAllowed(id)) {
      // If cached but policy forbids, consider as disallowed
      if (fs.existsSync(fp)) return { status: 'DISALLOWED_DOMAIN', message: 'domain is not allowlisted (cached resource present, but policy forbids use)' };
      return { status: "DISALLOWED_DOMAIN", message: "domain is not allowlisted" };
    }

    if (fs.existsSync(fp) && meta) {
      const now = Date.now();
      const age = now - (meta.at || fs.statSync(fp).mtimeMs);
      if (this.ttlMs > 0 && age > this.ttlMs) {
        // expired
        if (this.offline) return { status: "EXPIRED", message: 'cache expired and offline' };
        // attempt refresh if fetcher available, otherwise mark expired
        if (!this.fetcher) return { status: "EXPIRED", message: 'cache expired and no fetcher' };
        // fallthrough to fetch below
      } else {
        return { status: "CACHED", path: fp, meta };
      }
    }

    if (this.offline) return { status: "OFFLINE_GRACEFUL_SKIP" };

    // If id looks like a URL, check allowlist
    if (isUrl) {
      if (!this._domainAllowed(id)) return { status: "DISALLOWED_DOMAIN", message: "domain is not allowlisted" };
      if (!this.fetcher) return { status: "OFFLINE_GRACEFUL_SKIP" };
      try {
        const fetched = await this.fetcher(String(id));
        if (!fetched || !fetched.buffer) return { status: "FETCH_ERROR", message: "empty response" };
        // content-type validation
        if (this.allowedContentTypes && fetched.contentType) {
          const ct = String(fetched.contentType||'').split(';')[0].trim().toLowerCase();
          const allowed = this.allowedContentTypes.map(s=>s.toLowerCase());
          if (!allowed.includes(ct)) return { status: 'DISALLOWED_CONTENT_TYPE', message: 'content-type not allowed', contentType: fetched.contentType };
        }
        // size checks
        if (Buffer.byteLength(fetched.buffer) > this.maxSizeBytes) return { status: "FETCH_ERROR", message: "asset exceeds maxSizeBytes" };
        const stored = await this.storeAsset(id, fetched.buffer, { contentType: fetched.contentType });
        // return stored (STORED)
        return stored;
      } catch (err) {
        return { status: "FETCH_ERROR", message: String(err && err.message || err) };
      }
    }
    return { status: "OFFLINE_GRACEFUL_SKIP" };
  }

  // store buffer deterministically and protect against symlink traversal
  async storeAsset(id, buffer, opts = {}) {
    const fp = this.filenameForId(id);
    const dir = path.dirname(fp);
    try { fs.mkdirSync(dir, { recursive: true }); } catch (e) { }
    // write to temp then rename
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
    // write metadata
    const meta = { id: String(id), at: Date.now(), size: stats.size, contentType: opts.contentType || null };
    this._writeMeta(fp, meta);
    // enforce eviction
    try { await this._enforceEviction(); } catch (e) { /* best-effort */ }
    return { status: 'STORED', path: fp, meta };
  }
}

module.exports = { AssetDownloader };