const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');
const http = require('http');

function searchGoogle(query) {
    const key = process.env.GOOGLE_CUSTOM_SEARCH_KEY;
    const engine = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE;
    if (!key || !engine) throw new Error('Set GOOGLE_CUSTOM_SEARCH_KEY and GOOGLE_CUSTOM_SEARCH_ENGINE in the VS Code environment.');
    const url = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(key)}&cx=${encodeURIComponent(engine)}&q=${encodeURIComponent(query)}`;
    return requestJson(url).then((data) => ({ query, items: (data.items || []).slice(0, 10).map((item) => ({ title: item.title, url: item.link, snippet: item.snippet })) }));
}

function downloadAsset(sourceUrl, fileName) {
    const parsed = new URL(sourceUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Only HTTP and HTTPS downloads are allowed.');
    const safeName = path.basename(fileName || path.basename(parsed.pathname) || 'ae-studio-asset').replace(/[^a-zA-Z0-9._-]/g, '_');
    const directory = path.join(os.tmpdir(), 'ae-studio-assets');
    fs.mkdirSync(directory, { recursive: true });
    const target = path.join(directory, safeName);
    return new Promise((resolve, reject) => {
        const client = parsed.protocol === 'https:' ? https : http;
        const request = client.get(parsed, { headers: { 'User-Agent': 'AE-Studio-Bridge/1.0' } }, (response) => {
            if ([301, 302, 307, 308].includes(response.statusCode) && response.headers.location) return downloadAsset(new URL(response.headers.location, parsed).toString(), safeName).then(resolve, reject);
            if (response.statusCode !== 200) return reject(new Error(`Download HTTP ${response.statusCode}.`));
            const maxBytes = 100 * 1024 * 1024;
            let bytes = 0;
            const output = fs.createWriteStream(target);
            response.on('data', (chunk) => { bytes += chunk.length; if (bytes > maxBytes) request.destroy(new Error('Download exceeds 100 MB limit.')); });
            response.pipe(output);
            output.on('finish', () => output.close(() => resolve({ path: target, bytes })));
            output.on('error', reject);
        });
        request.setTimeout(30000, () => request.destroy(new Error('Download timed out.')));
        request.on('error', (error) => { try { fs.unlinkSync(target); } catch (_) { } reject(error); });
    });
}

function requestJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'AE-Studio-Bridge/1.0' } }, (response) => {
            let raw = '';
            response.setEncoding('utf8');
            response.on('data', (chunk) => { raw += chunk; });
            response.on('end', () => {
                if (response.statusCode < 200 || response.statusCode >= 300) return reject(new Error(`Search HTTP ${response.statusCode}.`));
                try { resolve(JSON.parse(raw)); } catch (_) { reject(new Error('Search returned invalid JSON.')); }
            });
        }).on('error', reject);
    });
}

module.exports = { searchGoogle, downloadAsset };
