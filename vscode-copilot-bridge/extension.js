const vscode = require('vscode');
const http = require('http');
const { searchGoogle, downloadAsset } = require('./web-tools');
const { generateMedia } = require('./media-tools');
const { detectLocalProvider, completeLocal, listProviders } = require('./local-providers');
const { readMemory, appendMemory, clearMemory } = require('./shared-memory');
const { indexRepository, readManifest, searchRepository, readRepositoryFile } = require('./project-repository');
const { withAeTitanSystemPrompt } = require('./systemPrompt.config');

let server;
const requestWindows = new Map();
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60 * 1000;

function activate(context) {
    const start = vscode.commands.registerCommand('aeStudio.startCopilotBridge', () => startBridge());
    const stop = vscode.commands.registerCommand('aeStudio.stopCopilotBridge', () => stopBridge());
    context.subscriptions.push(start, stop);
    startBridge();
}

function startBridge() {
    if (server) return;
    const port = vscode.workspace.getConfiguration('aeStudio').get('copilotBridgePort', 43127);
    const configuredRepositoryRoot = vscode.workspace.getConfiguration('aeStudio').get('repositoryRoot', '');
    const repositoryRoot = configuredRepositoryRoot || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.env.AE_STUDIO_REPOSITORY_ROOT || process.cwd();
    server = http.createServer(async (request, response) => {
        const requestId = require('crypto').randomUUID();
        response.setHeader('X-Request-Id', requestId);
        const now = Date.now();
        const client = request.socket.remoteAddress || 'unknown';
        const window = requestWindows.get(client);
        if (!window || now - window.startedAt >= RATE_WINDOW_MS) requestWindows.set(client, { startedAt: now, count: 1 });
        else if (++window.count > RATE_LIMIT) {
            response.writeHead(429, { ...corsHeaders(), 'Content-Type': 'application/json', 'Retry-After': '60' });
            response.end(JSON.stringify({ error: 'Rate limit exceeded.', code: 'RATE_LIMITED', requestId }));
            return;
        }
        if (request.method === 'OPTIONS') {
            response.writeHead(204, corsHeaders());
            response.end();
            return;
        }
        if (request.method === 'GET' && request.url === '/health') {
            const local = await detectLocalProvider();
            const hadiModels = await vscode.lm.selectChatModels({ vendor: 'oaicopilot' });
            const models = await vscode.lm.selectChatModels({ vendor: 'copilot' });
            const available = await listProviders();
            const ready = Boolean(local || hadiModels.length || models.length);
            const activeModels = hadiModels.length ? hadiModels : models;
            response.writeHead(ready ? 200 : 503, { ...corsHeaders(), 'Content-Type': 'application/json' });
            response.end(JSON.stringify({ ok: ready, provider: local ? local.id : hadiModels.length ? 'hadi' : 'github-copilot', source: local ? 'local-runtime' : 'vscode.lm', model: local ? local.model : activeModels[0] ? activeModels[0].id : null, models: models.length, hadiModels: hadiModels.map((model) => ({ id: model.id, family: model.family, name: model.name })), copilotModels: models.map((model) => ({ id: model.id, family: model.family, name: model.name })), providers: available, install: { ollama: 'https://ollama.com/download', gpt4all: 'https://www.nomic.ai/gpt4all', lmStudio: 'https://lmstudio.ai/download' }, message: local ? `Local AI ready: ${local.id}/${local.model}.` : hadiModels.length ? 'HADI is ready.' : ready ? 'Copilot is ready.' : 'Start Ollama, GPT4All Local API Server, or LM Studio; alternatively activate HADI/Copilot in VS Code.' }));
            return;
        }
        if (request.method === 'GET' && request.url === '/v1/memory') {
            response.writeHead(200, { ...corsHeaders(), 'Content-Type': 'application/json' });
            response.end(JSON.stringify(readMemory()));
            return;
        }
        if (request.method === 'POST' && request.url === '/v1/memory') {
            try {
                const body = await readJson(request);
                response.writeHead(200, { ...corsHeaders(), 'Content-Type': 'application/json' });
                response.end(JSON.stringify(appendMemory(body.entries || body)));
            } catch (error) {
                response.writeHead(error.statusCode || 400, { ...corsHeaders(), 'Content-Type': 'application/json' });
                response.end(JSON.stringify({ error: error.message, code: error.code || 'REQUEST_INVALID', requestId }));
            }
            return;
        }
        if (request.method === 'DELETE' && request.url === '/v1/memory') {
            response.writeHead(200, { ...corsHeaders(), 'Content-Type': 'application/json' });
            response.end(JSON.stringify(clearMemory()));
            return;
        }
        if (request.method === 'GET' && request.url === '/v1/repository') {
            response.writeHead(200, { ...corsHeaders(), 'Content-Type': 'application/json' });
            response.end(JSON.stringify(readManifest(repositoryRoot)));
            return;
        }
        if (request.method === 'POST' && request.url === '/v1/repository/index') {
            response.writeHead(200, { ...corsHeaders(), 'Content-Type': 'application/json' });
            response.end(JSON.stringify(indexRepository(repositoryRoot)));
            return;
        }
        if (request.method === 'POST' && request.url === '/v1/repository/search') {
            const body = await readJson(request);
            response.writeHead(200, { ...corsHeaders(), 'Content-Type': 'application/json' });
            response.end(JSON.stringify(searchRepository(body.query, repositoryRoot, body.limit)));
            return;
        }
        if (request.method === 'GET' && request.url.startsWith('/v1/repository/file')) {
            const query = new URL(request.url, 'http://127.0.0.1').searchParams;
            response.writeHead(200, { ...corsHeaders(), 'Content-Type': 'application/json' });
            response.end(JSON.stringify(readRepositoryFile(query.get('path'), repositoryRoot)));
            return;
        }
        if (request.method === 'POST' && (request.url === '/v1/search' || request.url === '/v1/download')) {
            try {
                const body = await readJson(request);
                const result = request.url === '/v1/search' ? await searchGoogle(String(body.query || '')) : await downloadAsset(String(body.url || ''), body.fileName);
                response.writeHead(200, { ...corsHeaders(), 'Content-Type': 'application/json' });
                response.end(JSON.stringify(result));
            } catch (error) {
                response.writeHead(error.statusCode || 400, { ...corsHeaders(), 'Content-Type': 'application/json' });
                response.end(JSON.stringify({ error: error.message, code: error.code || 'REQUEST_INVALID', requestId }));
            }
            return;
        }
        if (request.method === 'POST' && request.url === '/v1/media') {
            try {
                const body = await readJson(request);
                if (!['image', 'audio', 'video'].includes(body.kind)) throw new Error('Media kind must be image, audio, or video.');
                const result = await generateMedia(body.kind, body);
                response.writeHead(200, { ...corsHeaders(), 'Content-Type': 'application/json' });
                response.end(JSON.stringify(result));
            } catch (error) {
                response.writeHead(error.statusCode || 400, { ...corsHeaders(), 'Content-Type': 'application/json' });
                response.end(JSON.stringify({ error: error.message, code: error.code || 'REQUEST_INVALID', requestId }));
            }
            return;
        }
        if (request.method !== 'POST' || request.url !== '/v1/chat/completions') {
            response.writeHead(404, corsHeaders());
            response.end(JSON.stringify({ error: 'Not found' }));
            return;
        }
        try {
            const body = await readJson(request);
            const messages = Array.isArray(body.messages) ? body.messages : [];
            const result = await askEngine(messages, body.model, body.provider);
            response.writeHead(200, { ...corsHeaders(), 'Content-Type': 'application/json' });
            response.end(JSON.stringify({ id: 'ae-studio-copilot', object: 'chat.completion', choices: [{ index: 0, message: { role: 'assistant', content: result.text }, finish_reason: 'stop' }], usage: result.usage }));
        } catch (error) {
            response.writeHead(error.statusCode || 500, { ...corsHeaders(), 'Content-Type': 'application/json' });
            response.end(JSON.stringify({ error: error.message, code: error.code || 'BRIDGE_ERROR', requestId }));
        }
    });
    server.on('error', (error) => {
        vscode.window.showErrorMessage(`AE Studio Copilot Bridge: ${error.message}`);
        server = undefined;
    });
    server.listen(port, '127.0.0.1', () => {
        vscode.window.showInformationMessage(`AE Studio Copilot Bridge listening on 127.0.0.1:${port}`);
    });
}

async function askEngine(messages, preferredModel, providerType = 'auto') {
    messages = withAeTitanSystemPrompt(messages);
    const local = ['copilot', 'hadi'].includes(providerType) ? null : await detectLocalProvider(preferredModel, providerType);
    if (local && !['copilot', 'hadi'].includes(providerType)) {
        const result = await completeLocal(messages, preferredModel, providerType);
        return { text: result.text, usage: { prompt_tokens: estimateTokens(messages), completion_tokens: estimateTokens([{ content: result.text }]), total_tokens: estimateTokens(messages) + estimateTokens([{ content: result.text }]), estimated: true, provider: result.provider, model: result.model } };
    }
    if (providerType === 'ollama' && !local) throw new Error(`Selected Ollama model is not available: ${preferredModel || 'auto'}.`);
    if (providerType === 'gpt4all' && !local) throw new Error('GPT4All API is not available. Open GPT4All Desktop and enable Local API Server on port 4891.');
    if (providerType === 'lm-studio' && !local) throw new Error('Selected LM Studio model is not available.');
    if (providerType === 'hadi') return askHadi(messages, preferredModel);
    return askCopilot(messages, preferredModel);
}

async function askHadi(messages, preferredModel) {
    const models = await vscode.lm.selectChatModels({ vendor: 'oaicopilot' });
    if (!models.length) throw new Error('HADI is not active in VS Code. Open the HADI project and press F5.');
    return askLanguageModel(models, messages, preferredModel);
}

async function askCopilot(messages, preferredModel) {
    const models = await vscode.lm.selectChatModels({ vendor: 'copilot' });
    if (!models.length) throw new Error('No GitHub Copilot chat model is available. Sign in to GitHub Copilot in VS Code.');
    return askLanguageModel(models, messages, preferredModel);
}

async function askLanguageModel(models, messages, preferredModel) {
    const model = preferredModel && preferredModel !== 'auto'
        ? models.find((candidate) => candidate.id === preferredModel || candidate.family === preferredModel)
        : models[0];
    if (!model) throw new Error(`Selected VS Code model is not available: ${preferredModel || 'auto'}.`);
    const chatMessages = messages.map((message) => {
        if (message.role === 'system' && typeof vscode.LanguageModelChatMessage.System === 'function') return vscode.LanguageModelChatMessage.System(message.content);
        if (message.role === 'assistant' && typeof vscode.LanguageModelChatMessage.Assistant === 'function') return vscode.LanguageModelChatMessage.Assistant(message.content);
        return vscode.LanguageModelChatMessage.User(message.content);
    });
    const request = await model.sendRequest(chatMessages, {}, new vscode.CancellationTokenSource().token);
    let text = '';
    for await (const fragment of request.text) text += fragment;
    return { text, usage: { prompt_tokens: estimateTokens(messages), completion_tokens: estimateTokens([ { content: text } ]), total_tokens: estimateTokens(messages) + estimateTokens([{ content: text }]), estimated: true } };
}

function estimateTokens(messages) {
    return Math.max(1, Math.ceil(messages.reduce((total, message) => total + String(message.content || '').length, 0) / 4));
}

function readJson(request) {
    return new Promise((resolve, reject) => {
        let raw = '';
        let tooLarge = false;
        request.on('data', (chunk) => {
            if (tooLarge) return;
            raw += chunk;
            if (raw.length > 2_000_000) tooLarge = true;
        });
        request.on('end', () => {
            if (tooLarge) {
                const error = new Error('Request body exceeds the 2 MB limit.');
                error.code = 'PAYLOAD_TOO_LARGE';
                error.statusCode = 413;
                reject(error);
                return;
            }
            try { resolve(JSON.parse(raw || '{}')); } catch (error) { reject(new Error('Invalid JSON request.')); }
        });
        request.on('error', reject);
    });
}

function corsHeaders() {
    return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS' };
}

function stopBridge() {
    if (!server) return;
    server.close();
    server = undefined;
    vscode.window.showInformationMessage('AE Studio Copilot Bridge stopped.');
}

function deactivate() {
    stopBridge();
}

module.exports = { activate, deactivate };
