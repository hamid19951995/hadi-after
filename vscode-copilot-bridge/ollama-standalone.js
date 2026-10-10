const http = require('http');
const { detectLocalProvider, completeLocal, listProviders } = require('./local-providers');
const { searchGoogle, downloadAsset } = require('./web-tools');
const { generateMedia } = require('./media-tools');
const { readMemory, appendMemory, clearMemory } = require('./shared-memory');
const { indexRepository, readManifest, searchRepository, readRepositoryFile } = require('./project-repository');
const { withAeTitanSystemPrompt } = require('./systemPrompt.config');

const port = Number(process.env.AE_STUDIO_BRIDGE_PORT || 43127);
const repositoryRoot = process.env.AE_STUDIO_REPOSITORY_ROOT || process.cwd();
const server = http.createServer(async (request, response) => {
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    if (request.method === 'OPTIONS') { response.writeHead(204); response.end(); return; }
    try {
        if (request.method === 'GET' && request.url === '/health') {
            const provider = await detectLocalProvider();
            const providers = await listProviders();
            send(response, provider ? 200 : 503, { ok: Boolean(provider), provider: provider ? provider.id : null, source: 'local-runtime', model: provider ? provider.model : null, providers, install: { ollama: 'https://ollama.com/download', gpt4all: 'https://www.nomic.ai/gpt4all', lmStudio: 'https://lmstudio.ai/download' }, message: provider ? `Local AI ready: ${provider.id}/${provider.model}.` : 'Install Ollama, GPT4All, or LM Studio and start the selected local server. For GPT4All, enable its Local API Server on port 4891.' });
            return;
        }
        if (request.method === 'GET' && request.url === '/models') { send(response, 200, { providers: await listProviders() }); return; }
        if (request.method === 'GET' && request.url === '/v1/memory') { send(response, 200, readMemory()); return; }
        if (request.method === 'POST' && request.url === '/v1/memory') { const body = await readJson(request); send(response, 200, appendMemory(body.entries || body)); return; }
        if (request.method === 'DELETE' && request.url === '/v1/memory') { send(response, 200, clearMemory()); return; }
        if (request.method === 'GET' && request.url === '/v1/repository') { send(response, 200, readManifest(repositoryRoot)); return; }
        if (request.method === 'POST' && request.url === '/v1/repository/index') { send(response, 200, indexRepository(repositoryRoot)); return; }
        if (request.method === 'POST' && request.url === '/v1/repository/search') { const body = await readJson(request); send(response, 200, searchRepository(body.query, repositoryRoot, body.limit)); return; }
        if (request.method === 'GET' && request.url.startsWith('/v1/repository/file')) { const query = new URL(request.url, 'http://127.0.0.1').searchParams; send(response, 200, readRepositoryFile(query.get('path'), repositoryRoot)); return; }
        if (request.method === 'POST' && (request.url === '/v1/search' || request.url === '/v1/download')) {
            try {
                const body = await readJson(request);
                const result = request.url === '/v1/search'
                    ? await searchGoogle(String(body.query || ''))
                    : await downloadAsset(String(body.url || ''), body.fileName);
                send(response, 200, result);
            } catch (error) {
                send(response, 400, { error: error.message });
            }
            return;
        }
        if (request.method === 'POST' && request.url === '/v1/media') {
            try {
                const body = await readJson(request);
                if (!['image', 'audio', 'video'].includes(body.kind)) throw new Error('Media kind must be image, audio, or video.');
                send(response, 200, await generateMedia(body.kind, body));
            } catch (error) {
                send(response, 400, { error: error.message });
            }
            return;
        }
        if (request.method === 'POST' && request.url === '/v1/chat/completions') {
            const body = await readJson(request);
            const messages = withAeTitanSystemPrompt(Array.isArray(body.messages) ? body.messages : []);
            const result = await completeLocal(messages, body.model, body.provider || 'auto');
            const promptTokens = estimateTokens(messages);
            const completionTokens = estimateTokens([{ content: result.text }]);
            send(response, 200, { id: 'ae-studio-ollama', object: 'chat.completion', choices: [{ index: 0, message: { role: 'assistant', content: result.text }, finish_reason: 'stop' }], usage: { prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: promptTokens + completionTokens, estimated: true, provider: result.provider, model: result.model } });
            return;
        }
        send(response, 404, { error: 'Not found' });
    } catch (error) { send(response, 500, { error: error.message }); }
});

server.listen(port, '127.0.0.1', () => console.log(`AE Studio Ollama bridge listening on 127.0.0.1:${port}`));
function send(response, status, body) { response.writeHead(status, { 'Content-Type': 'application/json' }); response.end(JSON.stringify(body)); }
function readJson(request) { return new Promise((resolve, reject) => { let raw = ''; request.on('data', (chunk) => { raw += chunk; if (raw.length > 2000000) request.destroy(new Error('Request too large.')); }); request.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch (_) { reject(new Error('Invalid JSON.')); } }); request.on('error', reject); }); }
function estimateTokens(messages) { return Math.max(1, Math.ceil(messages.reduce((total, message) => total + String(message.content || '').length, 0) / 4)); }
