const assert = require('assert');
const signer = require('../../kernel/manifest/manifest-signer');
const validator = require('../../kernel/manifest/manifest-validator');

(function () {
  // generate keypair
  const { publicKey, privateKey } = signer.generateKeyPair();
  const script = "// sample ae script\n$.writeln('hello');";
  const manifest = { id: 'test-script-1', name: 'test', script: script, createdBy: 'tester' };
  const signed = signer.signManifest(manifest, privateKey);
  assert.ok(signed.signature, 'signature present');
  assert.ok(signed.scriptHash, 'scriptHash present');
  // verify with correct public key and script content
  const ok = validator.verifyManifest(signed, publicKey, { scriptContent: script });
  assert.strictEqual(ok, true);
  // tamper with scriptHash
  const bad = JSON.parse(JSON.stringify(signed));
  bad.scriptHash = 'deadbeef';
  let threw = false;
  try { validator.verifyManifest(bad, publicKey, { scriptContent: script }); } catch (e) { threw = true; /* tampering the scriptHash will break the signature */ assert.strictEqual(e.code, 'MANIFEST_SIGNATURE_INVALID'); }
  assert.ok(threw, 'scriptHash mismatch should throw');

  console.log('manifest signer/validator tests passed');
})();