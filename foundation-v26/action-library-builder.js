"use strict";
const v25=require("../foundation-v25/character-catalog");
function buildActionLibrary(input){
 const requested=(input&&input.actions)||v25.actions();
 const unique=[]; for(const a of requested){const n=v25.normalizeAction(a)||String(a); if(!unique.includes(n)) unique.push(n);}
 return {kind:"original-action-library.v1",sourceMode:"semantic-metadata-only",copyAssets:false,actions:unique.map(name=>({name,contract:{inputs:["characterId","start","duration"],output:"keyframe-plan"},reconciliation:{strategy:"controller-keyframe-signature"}}))};
}
module.exports={buildActionLibrary};
