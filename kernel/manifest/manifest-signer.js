"use strict";

const crypto = require('crypto');
const { canonicalize, sha256 } = require('../crypto/canonical');

function generateKeyPair() {
  // RSA 2048 for compatibility with many hosts
  return crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
}

function computeScriptHash(scriptContent) {
  return crypto.createHash('sha256').update(String(scriptContent || ''), 'utf8').digest('hex');
}

function signManifest(manifest, privateKeyPem) {
  if (!manifest || typeof manifest !== 'object') throw new Error('manifest object required');
  if (!privateKeyPem) throw new Error('privateKeyPem required');
  // Clone manifest and ensure signature not present
  const m = JSON.parse(JSON.stringify(manifest));
  delete m.signature;
  // attach scriptHash if script provided so it is part of the signed payload
  if (manifest.script) m.scriptHash = computeScriptHash(manifest.script);
  // canonicalize object for stable signing
  const payload = canonicalize(m);
  const signer = crypto.createSign('sha256');
  signer.update(payload);
  signer.end();
  const signature = signer.sign({ key: privateKeyPem, padding: crypto.constants.RSA_PKCS1_PSS_PADDING, saltLength: 32 });
  const sigB64 = signature.toString('base64');
  const signed = JSON.parse(JSON.stringify(m));
  signed.signature = sigB64;
  return signed;
}

module.exports = { generateKeyPair, signManifest, computeScriptHash };