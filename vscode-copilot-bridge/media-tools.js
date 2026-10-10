const https = require('https');
const { downloadAsset } = require('./web-tools');

async function generateMedia(kind, payload) {
    const config = {
        image: { endpoint: process.env.AE_STUDIO_IMAGE_ENDPOINT, key: process.env.AE_STUDIO_IMAGE_KEY },
        audio: { endpoint: process.env.AE_STUDIO_AUDIO_ENDPOINT, key: process.env.AE_STUDIO_AUDIO_KEY },
        video: { endpoint: process.env.AE_STUDIO_VIDEO_ENDPOINT, key: process.env.AE_STUDIO_VIDEO_KEY }
    }[kind];
    if (!config || !config.endpoint) throw new Error(`Set AE_STUDIO_${kind.toUpperCase()}_ENDPOINT and its key in the VS Code environment.`);
    const headers = { 'Content-Type': 'application/json' };
    if (config.key) headers.Authorization = `Bearer ${config.key}`;
    const response = await requestJson(config.endpoint, headers, { prompt: String(payload.prompt || ''), size: payload.size || '1024x1024', duration: payload.duration || 5, format: payload.format || (kind === 'audio' ? 'mp3' : kind === 'video' ? 'mp4' : 'png') });
    const url = response.url || (response.data && response.data[0] && response.data[0].url);
    if (!url) throw new Error('Media provider returned no downloadable URL.');
    return downloadAsset(url, payload.fileName || `ae-studio-${kind}`);
}

function requestJson(endpoint, headers, body) {
    return new Promise((resolve, reject) => {
        const target = new URL(endpoint);
        const request = https.request(target, { method: 'POST', headers }, (response) => {
            let raw = '';
            response.setEncoding('utf8');
            response.on('data', (chunk) => { raw += chunk; });
            response.on('end', () => {
                if (response.statusCode < 200 || response.statusCode >= 300) return reject(new Error(`Media provider HTTP ${response.statusCode}.`));
                try { resolve(JSON.parse(raw)); } catch (_) { reject(new Error('Media provider returned invalid JSON.')); }
            });
        });
        request.on('error', reject);
        request.write(JSON.stringify(body));
        request.end();
    });
}

module.exports = { generateMedia };
