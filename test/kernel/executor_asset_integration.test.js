const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { executeGraph } = require('../../kernel/executor');
const { AEAdapter, MockHost } = require('../../runtime/ae-adapter');
const { AssetDownloader } = require('../../src/core/asset_downloader');

(async function(){
  const tmp = path.join(__dirname, 'tmp-exec-asset');
  try { fs.rmSync(tmp, { recursive: true }); } catch(e){}
  fs.mkdirSync(tmp, { recursive: true });

  // fetcher returns small buffer and contentType
  const fetcherOk = async (url) => ({ buffer: Buffer.from('ok:'+url), contentType: 'image/png' });
  const asset = new AssetDownloader({ cacheDir: tmp, workspaceRoot: tmp, offline: false, allowlist: ['example.com'], fetcher: fetcherOk, allowedContentTypes: ['image/png'] });

  const nodes = [ { id: 'n1', command: 'summary', payload: {}, deps: [] }, { id: 'n2', command: 'importFootage', payload: { assetUrl: 'https://example.com/asset1.png' }, deps: ['n1'] } ];
  const host = new MockHost({ responses: [ { ok: true, aepipe: { state: 'SUCCESS' } }, { ok: true, aepipe: { state: 'SUCCESS' } } ] });
  const adapter = new AEAdapter(host, { retryOnTransport: 0 });
  const report = await executeGraph(nodes, adapter, { dryRun: false, assetDownloader: asset });
  assert.strictEqual(report.nodes['n2'].ok, true);
  assert.ok(report.nodes['n2'].response && report.nodes['n2'].response.ok === true);

  // disallowed domain - clear cache to avoid reuse
  try { fs.rmSync(tmp, { recursive: true }); } catch(e){}
  fs.mkdirSync(tmp, { recursive: true });
  const asset2 = new AssetDownloader({ cacheDir: tmp, workspaceRoot: tmp, offline: false, allowlist: ['other.com'], fetcher: fetcherOk, allowedContentTypes: ['image/png'] });
  const nodes2 = [ { id: 'n1', command: 'summary', payload: {}, deps: [] }, { id: 'n2', command: 'importFootage', payload: { assetUrl: 'https://example.com/asset2.png' }, deps: ['n1'] } ];
  const report2 = await executeGraph(nodes2, adapter, { dryRun: false, assetDownloader: asset2 });
  assert.strictEqual(report2.nodes['n2'].ok, false);
  assert.strictEqual(report2.nodes['n2'].error, 'ASSET_RESOLVE_FAILED');

  // large file rejection - clear cache
  try { fs.rmSync(tmp, { recursive: true }); } catch(e){}
  fs.mkdirSync(tmp, { recursive: true });
  const fetcherLarge = async (url) => ({ buffer: Buffer.alloc(2*1024*1024), contentType: 'image/png' });
  const asset3 = new AssetDownloader({ cacheDir: tmp, workspaceRoot: tmp, offline: false, allowlist: ['example.com'], fetcher: fetcherLarge, maxSizeBytes: 1024*1024, allowedContentTypes: ['image/png'] });
  const nodes3 = [ { id: 'n1', command: 'summary', payload: {}, deps: [] }, { id: 'n2', command: 'importFootage', payload: { assetUrl: 'https://example.com/large.png' }, deps: ['n1'] } ];
  const report3 = await executeGraph(nodes3, adapter, { dryRun: false, assetDownloader: asset3 });
  assert.strictEqual(report3.nodes['n2'].ok, false);
  assert.strictEqual(report3.nodes['n2'].error, 'ASSET_RESOLVE_FAILED');

  // offline with expired cache -> fail node
  try { fs.rmSync(tmp, { recursive: true }); } catch(e){}
  fs.mkdirSync(tmp, { recursive: true });
  const assetOfflineWriter = new AssetDownloader({ cacheDir: tmp, workspaceRoot: tmp, offline: false, allowlist: ['example.com'], fetcher: fetcherOk });
  await assetOfflineWriter.getAssetById('https://example.com/asset_offline.png');
  // create downloader in offline mode
  const asset4 = new AssetDownloader({ cacheDir: tmp, workspaceRoot: tmp, offline: true, allowlist: ['example.com'], fetcher: null, maxSizeBytes: 1024*1024, allowedContentTypes: ['image/png'], ttlMs: 1 });
  // wait for ttl to expire
  await new Promise(r=>setTimeout(r, 5));
  const nodes4 = [ { id: 'n1', command: 'summary', payload: {}, deps: [] }, { id: 'n2', command: 'importFootage', payload: { assetUrl: 'https://example.com/asset_offline.png' }, deps: ['n1'] } ];
  const report4 = await executeGraph(nodes4, adapter, { dryRun: false, assetDownloader: asset4 });
  assert.strictEqual(report4.nodes['n2'].ok, false);

  // cleanup
  fs.rmSync(tmp, { recursive: true });
  console.log('executor asset integration tests passed');
})();