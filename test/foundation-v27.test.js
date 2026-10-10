"use strict";
const assert=require("assert"); const v=require("../foundation-v27");
const c=v.generateCharacter({id:"hero",style:"corporate",hairStyle:"curly",outfit:"business"});
assert.equal(c.kind,"original-character.v1"); assert.equal(c.spec.metadata.original,true); assert.equal(c.spec.metadata.referenceAssetReuse,false); assert.equal(c.parts.length,12); assert.ok(v.validateCharacter(c));
const vars=v.generateVariants({id:"hero"},3); assert.equal(vars.length,3); assert.equal(new Set(vars.map(x=>x.spec.id)).size,3);
const plan=v.planGeneratedCharacterJob({text:"یک شخصیت راه برود و دست تکان دهد",duration:5,character:{id:"demo",style:"modern"},variantCount:3}); assert.equal(plan.character.spec.id,"demo"); assert.equal(plan.variants.length,3);
console.log("Foundation v27 original character generator tests: PASS");
