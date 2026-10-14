"use strict";

const assert = require("assert");
const fs = require('fs');
const path = require('path');

// Adapter semantics:
// sendCommand(command, payload, opts) => Promise<envelope>
// envelope: { ok: boolean, aepipe: { state: 'SUCCESS'|'UNKNOWN'|'FAILED' }, hostReadback?: {...}, message?: string }

class AEAdapter {
  constructor(host, opts = {}) {
    assert(host && typeof host.sendRaw === "function", "host with sendRaw required");
    this.host = host;
    this.timeoutMs = opts.timeoutMs || 15000;
    this.retryOnTransport = opts.retryOnTransport === undefined ? 1 : opts.retryOnTransport;
    // feature flags
    try { this.flags = require(path.join(process.cwd(), 'config', 'feature-flags.json')); } catch (e) { this.flags = {}; }
  }

  async sendCommand(command, payload = {}, opts = {}) {
    const envelope = { ok: false, message: null, aepipe: { state: "UNKNOWN" } };

    // Defensive: validate runScript manifest if feature-flagged
    if (command === 'runScript' && this.flags.runScriptManifestValidation) {
      try {
        const validator = require('../kernel/manifest/manifest-validator');
        // expect payload.manifest and payload.source
        if (!payload || !payload.manifest) return { ok: false, message: 'runScript requires signed manifest', aepipe: { state: 'FAILED' } };
        // try to load configured public key
        let publicKeyPem = null;
        const publicPath = path.join(process.cwd(), 'config', 'manifest-public.pem');
        if (fs.existsSync(publicPath)) {
          publicKeyPem = fs.readFileSync(publicPath, 'utf8');
        } else if (payload.manifest && payload.manifest.publicKey) {
          publicKeyPem = payload.manifest.publicKey;
        }
        if (!publicKeyPem) return { ok: false, message: 'manifest public key not available', aepipe: { state: 'FAILED' } };
        // verify manifest signature and scriptHash
        validator.verifyManifest(payload.manifest, publicKeyPem, { scriptContent: payload.source || '' });
      } catch (manErr) {
        return { ok: false, message: 'MANIFEST_VALIDATION_FAILED: ' + (manErr && manErr.message || String(manErr)), aepipe: { state: 'FAILED' } };
      }
    }

    let attempts = 0;
    let lastErr = null;
    while (attempts <= this.retryOnTransport) {
      attempts += 1;
      try {
        const res = await Promise.race([
          this.host.sendRaw(command, payload, opts),
          new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error("AE_ADAPTER_TIMEOUT"), { code: "AE_ADAPTER_TIMEOUT" })), this.timeoutMs))
        ]);
        // transport returned a structured response
        if (res && res.aepipe && res.aepipe.state) {
          envelope.aepipe = res.aepipe;
          envelope.hostReadback = res.hostReadback || null;
          envelope.ok = res.ok === true && res.aepipe.state === "SUCCESS";
          envelope.message = res.message || null;
          return envelope;
        }
        // unknown shaped response -> keep UNKNOWN envelope and return
        envelope.message = "unstructured response";
        return envelope;
      } catch (err) {
        lastErr = err;
        // classify transport error vs host-execution error
        const transportError = !err || !err.aepipe;
        if (!transportError) {
          // host execution error returned as rejected envelope - return as failed
          return { ok: false, message: err.message || "host error", aepipe: err.aepipe || { state: "FAILED" } };
        }
        // transport error: attempt reconnect/readback then retry once
        if (attempts <= this.retryOnTransport) {
          try {
            if (typeof this.host.reconnect === "function") await this.host.reconnect();
            if (typeof this.host.readback === "function") await this.host.readback();
          } catch (re) {
            // keep trying according to retry policy
          }
          continue;
        }
        // exhausting retries -> return UNKNOWN transport failure envelope
        return { ok: false, message: lastErr && lastErr.message, aepipe: { state: "UNKNOWN" } };
      }
    }
    return { ok: false, message: lastErr && lastErr.message, aepipe: { state: "UNKNOWN" } };
  }
}

// Mock host for tests
class MockHost {
  constructor(behavior) {
    // behavior: { responses: [ { ok, aepipe, hostReadback } ], failFirst: true }
    this.behavior = behavior || {};
    this.callCount = 0;
  }
  async sendRaw(command, payload) {
    this.callCount += 1;
    const idx = this.callCount - 1;
    if (this.behavior.failFirst && idx === 0) {
      const e = new Error("transport fail");
      e.code = "TRANSPORT_ERROR";
      throw e;
    }
    const responses = this.behavior.responses || [];
    const r = responses[idx] || responses[responses.length - 1] || { ok: true, aepipe: { state: "SUCCESS" }, hostReadback: { verified: true } };
    return r;
  }
  async reconnect() { this.reconnected = true; return true; }
  async readback() { this.readback = true; return { ok: true }; }
}

module.exports = { AEAdapter, MockHost };