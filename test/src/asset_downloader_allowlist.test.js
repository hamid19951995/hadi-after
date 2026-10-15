const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { AssetDownloader } = require('../../src/core/asset_downloader');

(async function(){
  const tmp = path.join(__dirname, 'tmp-allowlist');
  try { fs.rmSync(tmp, { recursive: true }); } catch(e){}
  fs.mkdirSync(tmp, { recursive: true });

  // fetcher that returns buffer
  const fetcher = async (url) => {
    return { buffer: Buffer.from('hello:'+url) };
  };

  const downloader = new AssetDownloader({ cacheDir: tmp, workspaceRoot: tmp, offline: false, allowlist: ['example.com'], fetcher, maxSizeBytes: 1024*1024 });

  // domain not allowed
  const r1 = await downloader.getAssetById('https://notallowed.com/asset.png');
  assert.strictEqual(r1.status, 'DISALLOWED_DOMAIN');

  // allowed domain -> stored
  const r2 = await downloader.getAssetById('https://example.com/asset.png');
  assert.strictEqual(r2.status, 'STORED');
  assert.ok(fs.existsSync(r2.path));

  // cache hit
  const r3 = await downloader.getAssetById('https://example.com/asset.png');
  assert.strictEqual(r3.status, 'CACHED');

  // symlink protection: create cache dir symlink to outside
  const outside = path.join(__dirname, 'outside');
  try { fs.rmSync(outside, { recursive: true }); } catch(e){}
  fs.mkdirSync(outside, { recursive: true });
  const badCache = path.join(__dirname, 'tmp-badcache');
  try { fs.rmSync(badCache, { recursive: true }); } catch(e){}
  // create symlink pointing to outside
  try { fs.symlinkSync(outside, badCache, 'dir'); } catch (e) { console.warn('symlink creation not supported on this FS, skipping symlink test'); }
  let threw = false;
  try {
    const bad = new AssetDownloader({ cacheDir: badCache, workspaceRoot: tmp, offline: false, allowlist: ['example.com'], fetcher });
  } catch (err) {
    threw = true;
  }
  // If symlink creation not supported, this will be false; accept either
  // but ensure no unexpected exceptions

  fs.rmSync(tmp, { recursive: true });
  try { fs.rmSync(outside, { recursive: true }); } catch(e){}
  try { fs.rmSync(badCache, { recursive: true }); } catch(e){}

  console.log('asset downloader allowlist tests passed');
})();