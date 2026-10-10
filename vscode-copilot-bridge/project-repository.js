'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ignoredDirectories = new Set(['.git', '.ae-studio', 'node_modules', 'dist', 'build', 'out', '.vscode']);
const textExtensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.json', '.css', '.scss', '.html', '.md', '.txt', '.xml', '.yml', '.yaml', '.aepx']);
const maxFiles = 50000;
const maxIndexedBytes = 2 * 1024 * 1024;
const maxSearchResults = 30;

function repositoryRoot(explicitRoot) {
    const root = String(explicitRoot || process.env.AE_STUDIO_REPOSITORY_ROOT || process.cwd()).trim();
    return path.resolve(root);
}

function repositoryDir(root) {
    return path.join(root, '.ae-studio');
}

function manifestPath(root) {
    return path.join(repositoryDir(root), 'repository.json');
}

function walk(root, current, files) {
    if (files.length >= maxFiles) return;
    let entries;
    try { entries = fs.readdirSync(current, { withFileTypes: true }); } catch (_) { return; }
    for (const entry of entries) {
        if (files.length >= maxFiles) break;
        if (entry.name.startsWith('.') && entry.name !== '.env.example') continue;
        const absolute = path.join(current, entry.name);
        if (entry.isDirectory()) {
            if (!ignoredDirectories.has(entry.name)) walk(root, absolute, files);
            continue;
        }
        if (!entry.isFile()) continue;
        let stat;
        try { stat = fs.statSync(absolute); } catch (_) { continue; }
        const relative = path.relative(root, absolute).replace(/\\/g, '/');
        const extension = path.extname(entry.name).toLowerCase();
        const file = { path: relative, name: entry.name, extension, size: stat.size, modifiedAt: stat.mtime.toISOString(), text: textExtensions.has(extension) && stat.size <= maxIndexedBytes };
        if (file.text) {
            try {
                const content = fs.readFileSync(absolute);
                file.sha256 = crypto.createHash('sha256').update(content).digest('hex');
                file.content = content.toString('utf8').slice(0, maxIndexedBytes);
            } catch (_) { file.text = false; }
        }
        files.push(file);
    }
}

function indexRepository(explicitRoot) {
    const root = repositoryRoot(explicitRoot);
    if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) throw new Error(`Repository root does not exist: ${root}`);
    const files = [];
    walk(root, root, files);
    const manifest = { version: 1, root, indexedAt: new Date().toISOString(), fileCount: files.length, truncated: files.length >= maxFiles, files: files.map(({ content, ...file }) => file) };
    fs.mkdirSync(repositoryDir(root), { recursive: true });
    fs.writeFileSync(manifestPath(root), JSON.stringify(manifest, null, 2), 'utf8');
    return manifest;
}

function readManifest(explicitRoot) {
    const root = repositoryRoot(explicitRoot);
    try {
        return JSON.parse(fs.readFileSync(manifestPath(root), 'utf8'));
    } catch (_) {
        return indexRepository(root);
    }
}

function searchRepository(query, explicitRoot, limit = maxSearchResults) {
    const root = repositoryRoot(explicitRoot);
    const manifest = readManifest(root);
    const terms = String(query || '').toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return { root, indexedAt: manifest.indexedAt, results: [] };
    const results = [];
    for (const file of manifest.files || []) {
        let content = '';
        if (file.text) {
            try { content = fs.readFileSync(path.join(root, file.path), 'utf8').slice(0, maxIndexedBytes); } catch (_) { content = ''; }
        }
        const haystack = `${file.path}\n${content}`.toLowerCase();
        const score = terms.reduce((total, term) => total + (haystack.includes(term) ? (file.path.toLowerCase().includes(term) ? 3 : 1) : 0), 0);
        if (!score) continue;
        const firstTerm = terms.find((term) => content.toLowerCase().includes(term));
        const position = firstTerm ? content.toLowerCase().indexOf(firstTerm) : -1;
        const start = position >= 0 ? Math.max(0, position - 240) : 0;
        results.push({ path: file.path, name: file.name, size: file.size, extension: file.extension, score, snippet: content ? content.slice(start, start + 900) : '(binary or metadata-only file)' });
    }
    results.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
    return { root, indexedAt: manifest.indexedAt, query: String(query || ''), results: results.slice(0, Math.min(Number(limit) || maxSearchResults, maxSearchResults)) };
}

function readRepositoryFile(relativePath, explicitRoot) {
    const root = repositoryRoot(explicitRoot);
    const target = path.resolve(root, String(relativePath || ''));
    if (target !== root && !target.startsWith(`${root}${path.sep}`)) throw new Error('Repository path escapes the configured root.');
    const stat = fs.statSync(target);
    if (!stat.isFile()) throw new Error('Repository path is not a file.');
    if (stat.size > maxIndexedBytes) throw new Error(`File is too large to read directly (${stat.size} bytes). Search it instead.`);
    return { path: path.relative(root, target).replace(/\\/g, '/'), content: fs.readFileSync(target, 'utf8') };
}

module.exports = { repositoryRoot, indexRepository, readManifest, searchRepository, readRepositoryFile };
