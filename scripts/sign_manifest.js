#!/usr/bin/env node
"use strict";

const fs = require('fs');
const path = require('path');
const signer = require('../kernel/manifest/manifest-signer');

function usage() {
  console.log("Usage:");
  console.log("  node scripts/sign_manifest.js init            # generate keypair (public -> config/manifest-public.pem, private -> .keystore/manifest-private.pem)");
  console.log("  node scripts/sign_manifest.js sign <manifest.json>  # sign manifest using private key in .keystore/manifest-private.pem and emit signed manifest alongside input file");
  process.exit(1);
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length) return usage();
  const cmd = args[0];
  if (cmd === 'init') {
    const kp = signer.generateKeyPair();
    const keystoreDir = path.join(process.cwd(), '.keystore');
    if (!fs.existsSync(keystoreDir)) fs.mkdirSync(keystoreDir, { recursive: true });
    const privPath = path.join(keystoreDir, 'manifest-private.pem');
    const pubPath = path.join(process.cwd(), 'config', 'manifest-public.pem');
    fs.writeFileSync(privPath, kp.privateKey, { mode: 0o600 });
    if (!fs.existsSync(path.join(process.cwd(), 'config'))) fs.mkdirSync(path.join(process.cwd(), 'config'), { recursive: true });
    fs.writeFileSync(pubPath, kp.publicKey);
    console.log('Generated keypair:');
    console.log('  Private (keystore):', privPath);
    console.log('  Public (config):', pubPath);
    return;
  }
  if (cmd === 'sign') {
    const manifestFile = args[1];
    if (!manifestFile) return usage();
    const inputPath = path.resolve(manifestFile);
    if (!fs.existsSync(inputPath)) throw new Error('manifest file not found: ' + inputPath);
    const manifest = JSON.parse(fs.readFileSync(inputPath,'utf8'));
    const privPath = path.join(process.cwd(), '.keystore', 'manifest-private.pem');
    if (!fs.existsSync(privPath)) throw new Error('private key not found; run "node scripts/sign_manifest.js init" first');
    const privateKey = fs.readFileSync(privPath, 'utf8');
    // sign
    const signed = signer.signManifest(manifest, privateKey);
    const outPath = inputPath.replace(/\.json$/,'') + '.signed.json';
    fs.writeFileSync(outPath, JSON.stringify(signed, null, 2), 'utf8');
    console.log('Signed manifest written to', outPath);
    return;
  }
  usage();
}

main().catch(err => { console.error(err && err.stack || err); process.exit(2); });
