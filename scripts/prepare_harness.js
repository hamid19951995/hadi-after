#!/usr/bin/env node
"use strict";
const fs = require('fs');
const path = require('path');
const { AssetDownloader } = require('../src/core/asset_downloader');

// create a tiny 1x1 PNG buffer (minimal PNG)
function tinyPngBuffer() {
  // a minimal 1x1 PNG file in binary (transparent)
  return Buffer.from([
    0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A,
    0x00,0x00,0x00,0x0D,0x49,0x48,0x44,0x52,
    0x00,0x00,0x00,0x01,0x00,0x00,0x00,0x01,
    0x08,0x06,0x00,0x00,0x00,0x1F,0x15,0xC4,
    0x89,0x00,0x00,0x00,0x0A,0x49,0x44,0x41,
    0x54,0x78,0x9C,0x63,0x00,0x01,0x00,0x00,
    0x05,0x00,0x01,0x0D,0x0A,0x2D,0xB4,0x00,
    0x00,0x00,0x00,0x49,0x45,0x4E,0x44,0xAE,
    0x42,0x60,0x82
  ]);
}

async function main(){
  const repoRoot = process.cwd();
  const tmpCache = path.join(repoRoot, 'test', 'harness-cache');
  if (!fs.existsSync(tmpCache)) fs.mkdirSync(tmpCache, { recursive: true });

  const fetcher = async (url) => ({ buffer: tinyPngBuffer(), contentType: 'image/png' });
  const downloader = new AssetDownloader({ cacheDir: tmpCache, workspaceRoot: tmpCache, offline: false, allowlist: ['example.com'], fetcher, allowedContentTypes: ['image/png'] });
  const id = 'https://example.com/asset.png';
  const r = await downloader.getAssetById(id);
  if (r.status !== 'STORED' && r.status !== 'CACHED') throw new Error('failed to prepare asset: '+JSON.stringify(r));

  const input = { assetId: id, localPath: r.path };
  const outPath = path.join(repoRoot, 'test', 'harness-input.json');
  fs.writeFileSync(outPath, JSON.stringify(input, null, 2), 'utf8');
  console.log('prepared harness input at', outPath);
}

main().catch(e=>{ console.error(e && e.stack || e); process.exit(2); });
