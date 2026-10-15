const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { AssetDownloader } = require('../../src/core/asset_downloader');

(async function(){
  const tmp = path.join(__dirname, 'tmp-content');
  try { fs.rmSync(tmp, { recursive: true }); } catch(e){}
  fs.mkdirSync(tmp, { recursive: true });

  // fetcher returns disallowed content-type
  const fetcherBadType = async (url) => ({ buffer: Buffer.from('x'), contentType: 'text/html' });
  const downloader1 = new AssetDownloader({ cacheDir: tmp, workspaceRoot: tmp, offline: false, allowlist: ['example.com'], fetcher: fetcherBadType, allowedContentTypes: ['image/png'], maxSizeBytes: 1024*1024 });
  const res1 = await downloader1.getAssetById('https://example.com/bad.html');
  assert.strictEqual(res1.status, 'DISALLOWED_CONTENT_TYPE');

  // fetcher returns too large buffer
  const fetcherLarge = async (url) => ({ buffer: Buffer.alloc(2 * 1024 * 1024), contentType: 'image/png' });
  const downloader2 = new AssetDownloader({ cacheDir: tmp, workspaceRoot: tmp, offline: false, allowlist: ['example.com'], fetcher: fetcherLarge, allowedContentTypes: ['image/png'], maxSizeBytes: 1024*1024 });
  const res2 = await downloader2.getAssetById('https://example.com/large.png');
  assert.strictEqual(res2.status, 'FETCH_ERROR');

  // ensure allowlist still enforced
  const fetcherOk = async (url) => ({ buffer: Buffer.from('ok'), contentType: 'image/png' });
  const downloader3 = new AssetDownloader({ cacheDir: tmp, workspaceRoot: tmp, offline: false, allowlist: ['example.com'], fetcher: fetcherOk, maxSizeBytes: 1024*1024, allowedContentTypes: ['image/png'] });
  const disallowed = await downloader3.getAssetById('https://notallowed.com/x.png');
  assert.strictEqual(disallowed.status, 'DISALLOWED_DOMAIN');

  fs.rmSync(tmp, { recursive: true });
  console.log('asset downloader content-type and large file tests passed');
})();