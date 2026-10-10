"use strict";
const assert=require("assert"); const v=require("../foundation-v24");
const a=v.planCreativeJob({text:"یک ویدیوی 12 ثانیه ای درباره معماری اصفهان با سبک فلت بساز",language:"fa"});
assert.equal(a.brief.family,"architectural-landmark"); assert.equal(a.brief.style,"flat"); assert.equal(a.manifest.duration,12); assert.ok(a.manifest.layers.length>=4); assert.equal(a.scene.referencePolicy,"style-guided-original-output");
const c=v.planCreativeJob({text:"Create a 4 second animated chart",language:"en"}); assert.equal(c.brief.family,"infographic-chart"); assert.equal(c.manifest.duration,4);
const env=v.createVoiceEnvelope({transcript:"یک نمودار متحرک ۵ ثانیه ای بساز",confidence:.9}); const p=v.planFromVoice(env); assert.equal(p.brief.family,"infographic-chart");
const vars=v.createVariations({text:"Create a logo animation",language:"en"},3); assert.equal(vars.length,3); assert.equal(new Set(vars.map(x=>x.brief.style)).size,3);
console.log("Foundation v24 reference-guided motion pack tests: PASS");
