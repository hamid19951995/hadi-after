"use strict";
const assert=require("assert"); const v=require("../foundation-v25");
const p=v.planCharacterJob({text:"یک شخصیت بساز که وارد شود، راه برود، به محصول اشاره کند و دست تکان دهد",duration:8});
assert.equal(p.intent.actions[0],"walk"); assert.ok(p.intent.actions.includes("point")); assert.ok(p.intent.actions.includes("wave")); assert.ok(p.sequence.steps.length>=3); assert.equal(p.manifest.type,"character-animation-job.v1"); assert.equal(p.manifest.character.source.mode,"generated-original");
const voice=v.createVoiceEnvelope({transcript:"Create a character that walks, talks and points",confidence:.9}); const q=v.planCharacterFromVoice(voice); assert.ok(q.sequence.steps.some(s=>s.action==="walk")); assert.ok(q.sequence.steps.some(s=>s.action==="talk"));
assert.throws(()=>v.planCharacterJob({text:""}),/CHARACTER_INTENT_TEXT_REQUIRED/);
console.log("Foundation v25 autonomous character studio tests: PASS");
