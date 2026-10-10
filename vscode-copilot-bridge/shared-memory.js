'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const memoryFile = path.join(os.homedir(), '.ae-studio-shared-memory.json');
const maxEntries = 100;
const maxTextLength = 4000;

function readMemory() {
    try {
        const value = JSON.parse(fs.readFileSync(memoryFile, 'utf8'));
        return { version: 1, entries: Array.isArray(value.entries) ? value.entries.slice(-maxEntries) : [] };
    } catch (_) {
        return { version: 1, entries: [] };
    }
}

function writeMemory(memory) {
    const temporaryFile = `${memoryFile}.tmp`;
    fs.writeFileSync(temporaryFile, JSON.stringify(memory, null, 2), 'utf8');
    fs.renameSync(temporaryFile, memoryFile);
    return memory;
}

function appendMemory(entries) {
    const memory = readMemory();
    const incoming = (Array.isArray(entries) ? entries : [entries])
        .filter((entry) => entry && typeof entry.text === 'string' && entry.text.trim())
        .map((entry) => ({
            role: entry.role === 'assistant' ? 'assistant' : entry.role === 'system' ? 'system' : 'user',
            text: entry.text.trim().slice(0, maxTextLength),
            createdAt: entry.createdAt || new Date().toISOString()
        }));
    return writeMemory({ version: 1, entries: memory.entries.concat(incoming).slice(-maxEntries) });
}

function clearMemory() {
    return writeMemory({ version: 1, entries: [] });
}

function memoryText() {
    return readMemory().entries.map((entry) => `${entry.role}: ${entry.text}`).join('\n');
}

module.exports = { readMemory, appendMemory, clearMemory, memoryText };
