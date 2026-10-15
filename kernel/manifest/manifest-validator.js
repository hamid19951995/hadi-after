"use strict";

const crypto = require('crypto');
const { canonicalize } = require('../crypto/canonical');

function computeScriptHash(scriptContent) {
  return crypto.createHash('sha256').update(String(scriptContent || ''), 'utf8').digest('hex');
}

function verifyManifest(signedManifest, publicKeyPem, options = {}) {
  if (!signedManifest || typeof signedManifest !== 'object') throw new Error('signedManifest required');
  if (!publicKeyPem) throw new Error('publicKeyPem required');
  const m = JSON.parse(JSON.stringify(signedManifest));
  const signature = m.signature;
  if (!signature) throw Object.assign(new Error('signature missing'), { code: 'MANIFEST_NO_SIGNATURE' });
  delete m.signature;
  const payload = canonicalize(m);
  const verifier = crypto.createVerify('sha256');
  verifier.update(payload);
  verifier.end();
  const sigBuf = Buffer.from(signature, 'base64');
  const ok = verifier.verify({ key: publicKeyPem, padding: crypto.constants.RSA_PKCS1_PSS_PADDING, saltLength: 32 }, sigBuf);
  if (!ok) throw Object.assign(new Error('signature verification failed'), { code: 'MANIFEST_SIGNATURE_INVALID' });
  // optional script content verification
  if (options.scriptContent !== undefined) {
    const expected = computeScriptHash(options.scriptContent);
    if (!m.scriptHash) throw Object.assign(new Error('manifest missing scriptHash'), { code: 'MANIFEST_NO_SCRIPTHASH' });
    if (m.scriptHash !== expected) throw Object.assign(new Error('scriptHash mismatch'), { code: 'MANIFEST_SCRIPTHASH_MISMATCH' });
  }
  return true;
}

module.exports = { verifyManifest, computeScriptHash };