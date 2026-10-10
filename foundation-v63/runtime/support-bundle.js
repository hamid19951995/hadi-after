const crypto=require('crypto');
function redact(value){const s=JSON.stringify(value);return JSON.parse(s.replace(/(token|password|secret)\"?\s*:\s*\"[^\"]*/gi,'$1":"[REDACTED]'))}
function buildBundle(input={}){const bundle={schema:'ae-boss-support-v1',generatedAt:new Date().toISOString(),diagnostics:redact(input.diagnostics||{}),events:redact(input.events||[]),evidence:redact(input.evidence||[]),release:redact(input.release||{})};bundle.sha256=crypto.createHash('sha256').update(JSON.stringify(bundle)).digest('hex');return bundle}
module.exports={buildBundle};
