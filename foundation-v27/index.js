"use strict";
const v26=require("../foundation-v26"); const generator=require("./character-generator"); const variants=require("./character-variants");
function planGeneratedCharacterJob(input={}){const character=generator.generateCharacter(input.character||input);generator.validateCharacter(character);const base=v26.planReferenceGuidedCharacterJob(input);return {...base,character,variants:variants.generateVariants(input.character||input,Number(input.variantCount||3))};}
module.exports={...v26,...generator,...variants,planGeneratedCharacterJob};
