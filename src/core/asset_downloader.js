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
    this.offline = !!opts.offline;
    // ensure cache dir exists
    try { fs.mkdirSync(this.cacheDir, { recursive: true }); } catch (e) { /* ignore */ }
  }

  // deterministic file name for a URL or id
  filenameForId(id) {
    const h = crypto.createHash("sha256").update(String(id), "utf8").digest("hex");
    return path.join(this.cacheDir, h);
  }

  // returns { status: 'CACHED', path } or { status: 'OFFLINE_GRACEFUL_SKIP' } or throws on internal error
  async getAssetById(id) {
    const fp = this.filenameForId(id);
    if (fs.existsSync(fp)) return { status: "CACHED", path: fp };
    if (this.offline) return { status: "OFFLINE_GRACEFUL_SKIP" };
    // network path would be implemented by a registered fetcher; not allowed by default
    return { status: "OFFLINE_GRACEFUL_SKIP" };
  }

  // store buffer deterministically
  async storeAsset(id, buffer) {
    const fp = this.filenameForId(id);
    fs.writeFileSync(fp, buffer);
    return { status: "STORED", path: fp };
  }
}

module.exports = { AssetDownloader };