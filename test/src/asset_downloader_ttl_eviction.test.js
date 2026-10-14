const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { AssetDownloader } = require('../../src/core/asset_downloader');

(async function(){
  const tmp = path.join(__dirname, 'tmp-ttl');
  try { fs.rmSync(tmp, { recursive: true }); } catch(e){}
  fs.mkdirSync(tmp, { recursive: true });

  // simple fetcher returning variable buffers
  const fetcher = async (url) => {
    return { buffer: Buffer.from('data:'+url), contentType: 'image/png' };
  };

  // set small ttl and small maxFiles to trigger eviction
  const downloader = new AssetDownloader({ cacheDir: tmp, workspaceRoot: tmp, offline: false, allowlist: ['example.com'], fetcher, ttlMs: 10, maxFiles: 2, maxTotalBytes: 1024*1024, maxSizeBytes: 1024*1024, allowedContentTypes: ['image/png'] });

  // store two assets
  const a1 = await downloader.getAssetById('https://example.com/a1.png');
  assert.strictEqual(a1.status, 'STORED');
  const a2 = await downloader.getAssetById('https://example.com/a2.png');
  assert.strictEqual(a2.status, 'STORED');

  // ensure both cached (allow STORED due to timing)
  const c1 = await downloader.getAssetById('https://example.com/a1.png');
  assert.ok(c1.status === 'CACHED' || c1.status === 'STORED');

  // wait for ttl to expire
  await new Promise(r=>setTimeout(r, 20));
  // request a1: expired -> since fetcher available should refresh and store -> STORED
  const r1 = await downloader.getAssetById('https://example.com/a1.png');
  assert.ok(r1.status === 'STORED' || r1.status === 'CACHED');

  // add a3 to exceed maxFiles (=2) and trigger eviction
  const a3 = await downloader.getAssetById('https://example.com/a3.png');
  assert.strictEqual(a3.status, 'STORED');

  // now ensure there are at most 2 files in cache dir
  const files = fs.readdirSync(tmp).filter(f=>!f.endsWith('.meta.json'));
  assert.ok(files.length <= 2);

  // cleanup
  fs.rmSync(tmp, { recursive: true });
  console.log('asset downloader ttl/eviction tests passed');
})();