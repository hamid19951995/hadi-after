const http = require('http');
const https = require('https');

async function detectLocalProvider(preferredModel, providerType = 'auto') {
    if (providerType === 'gpt4all') return probeOpenAI('http://127.0.0.1:4891/v1/models', 'gpt4all', preferredModel);
    if (providerType !== 'lm-studio') {
        const ollama = await probeOllama(preferredModel);
        if (ollama) return ollama;
    }
    if (providerType === 'auto') {
        const gpt4all = await probeOpenAI('http://127.0.0.1:4891/v1/models', 'gpt4all', preferredModel);
        if (gpt4all) return gpt4all;
    }
    if (providerType !== 'ollama') return probeOpenAI('http://127.0.0.1:1234/v1/models', 'lm-studio', preferredModel);
    return null;
}

async function listProviders() {
    const providers = [];
    const ollama = await listOllama();
    if (ollama) providers.push(ollama);
    const gpt4all = await listOpenAI('http://127.0.0.1:4891/v1/models', 'gpt4all');
    if (gpt4all) providers.push(gpt4all);
    const lmStudio = await listOpenAI('http://127.0.0.1:1234/v1/models', 'lm-studio');
    if (lmStudio) providers.push(lmStudio);
    return providers;
}

async function completeLocal(messages, preferredModel, providerType = 'auto') {
    const effectiveModel = preferredModel && preferredModel !== 'auto' ? preferredModel : await chooseLocalModel(messages);
    const provider = await detectLocalProvider(effectiveModel, providerType);
    if (!provider) throw new Error('No local AI found. Start Ollama, GPT4All with its Local API Server enabled, or LM Studio; alternatively sign in to GitHub Copilot in VS Code.');
    if (provider.id === 'ollama') {
        if (provider.capabilities && provider.capabilities.includes('chat')) {
            const result = await requestJson('http://127.0.0.1:11434/api/chat', { model: provider.model, messages, stream: false, options: { temperature: 0.1 } }, 120000);
            return { text: result.message && result.message.content || '', provider: provider.id, model: provider.model, estimated: true };
        }
        const prompt = messages.map((message) => `${String(message.role || 'user').toUpperCase()}:\n${String(message.content || '')}`).join('\n\n') + '\n\nASSISTANT:\n';
        const result = await requestJson('http://127.0.0.1:11434/api/generate', { model: provider.model, prompt, stream: false, options: { temperature: 0.1 } }, 120000);
        return { text: result.response || '', provider: provider.id, model: provider.model, estimated: true };
    }
    if (provider.id === 'gpt4all') {
        const result = await requestJson('http://127.0.0.1:4891/v1/chat/completions', { model: provider.model, temperature: 0.1, messages }, 120000);
        return { text: result.choices && result.choices[0] && result.choices[0].message && result.choices[0].message.content || '', provider: provider.id, model: provider.model, estimated: true };
    }
    const result = await requestJson('http://127.0.0.1:1234/v1/chat/completions', { model: provider.model, temperature: 0.1, messages }, 120000);
    return { text: result.choices && result.choices[0] && result.choices[0].message && result.choices[0].message.content || '', provider: provider.id, model: provider.model, estimated: true };
}

async function chooseLocalModel(messages) {
    const result = await requestJson('http://127.0.0.1:11434/api/tags', null, 1200).catch(() => ({ models: [] }));
    const models = (result.models || []).map((model) => model.name).filter(Boolean);
    const text = (messages || []).map((message) => String(message && message.content || '')).join('\n').toLowerCase();
    const scriptMode = /script mode|extendscript|runscript|jsx|complex production|broadcast|چند.?سکانس|اسکریپت/.test(text);
    const agentMode = /agent mode|inspect.*plan|architect|اجرای|بساز|ساخت|ایجاد|تولید/.test(text);
    const priorities = scriptMode
        ? ['gpt-oss:20b', 'gemma3:12b', 'deepseek-r1:14b', 'deepseek-r1:8b', 'llama3.1:8b', 'gemma3:1b']
        : agentMode
            ? ['deepseek-r1:14b', 'deepseek-r1:8b', 'gpt-oss:20b', 'llama3.1:8b', 'gemma3:12b', 'gemma3:1b']
            : ['gemma3:1b', 'llama3.1:8b', 'gemma3:12b', 'deepseek-r1:8b'];
    for (let index = 0; index < priorities.length; index++) {
        if (models.indexOf(priorities[index]) >= 0) return priorities[index];
    }
    return models[0] || undefined;
}

async function probeOllama(preferredModel) {
    try {
        const result = await requestJson('http://127.0.0.1:11434/api/tags', null, 1200);
        const models = result.models || [];
        const preferred = preferredModel || process.env.AE_STUDIO_LOCAL_MODEL;
        const selected = preferred
            ? models.find((model) => model.name === preferred)
            : models.find((model) => /gemma3:1b/i.test(model.name))
                || models.find((model) => /llama3.1:8b/i.test(model.name))
                || models.find((model) => /deepseek-r1:8b/i.test(model.name))
                || models.find((model) => /deepseek-r1/i.test(model.name) && (model.capabilities || []).includes('chat'))
                || models.find((model) => /llama/i.test(model.name))
                || models.find((model) => /deepseek-r1/i.test(model.name))
                || models[0];
        const model = selected && selected.name;
        return model ? { id: 'ollama', model, capabilities: selected.capabilities || [] } : null;
    } catch (_) { return null; }
}

async function listOllama() {
    try {
        const result = await requestJson('http://127.0.0.1:11434/api/tags', null, 1200);
        return { id: 'ollama', models: (result.models || []).map((model) => model.name).filter(Boolean) };
    } catch (_) { return null; }
}

async function probeOpenAI(url, id, preferredModel) {
    try {
        const result = await requestJson(url, null, 1200);
        const models = result.data || [];
        const selected = preferredModel ? models.find((candidate) => candidate.id === preferredModel) : models[0];
        const model = selected && selected.id;
        return model ? { id, model } : null;
    } catch (_) { return null; }
}

async function listOpenAI(url, id) {
    try {
        const result = await requestJson(url, null, 1200);
        return { id, models: (result.data || []).map((model) => model.id).filter(Boolean) };
    } catch (_) { return null; }
}

function requestJson(url, body, timeout = 30000) {
    return new Promise((resolve, reject) => {
        const target = new URL(url);
        const client = target.protocol === 'https:' ? https : http;
        const options = { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json' } };
        const request = client.request(target, options, (response) => {
            let raw = '';
            response.setEncoding('utf8');
            response.on('data', (chunk) => { raw += chunk; });
            response.on('end', () => {
                if (response.statusCode < 200 || response.statusCode >= 300) return reject(new Error(`Local AI HTTP ${response.statusCode}.`));
                try { resolve(JSON.parse(raw)); } catch (_) { reject(new Error('Local AI returned invalid JSON.')); }
            });
        });
        request.setTimeout(timeout, () => request.destroy(new Error('Local AI probe timed out.')));
        request.on('error', reject);
        if (body) request.write(JSON.stringify(body));
        request.end();
    });
}

module.exports = { detectLocalProvider, completeLocal, listProviders, chooseLocalModel };
