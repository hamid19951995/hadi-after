"use strict";
const crypto=require("crypto");
function toCharacterManifest(sequence,options){
 const o=options||{}; const id=o.jobId||("character-"+crypto.createHash("sha1").update(JSON.stringify(sequence)).digest("hex").slice(0,12));
 return {jobId:id,type:"character-animation-job.v1",comp:o.comp||"AE_BOSS_CHARACTER_SCENE",width:o.width||1920,height:o.height||1080,frameRate:o.frameRate||30,duration:sequence.duration,character:{id:sequence.character,rig:"original-2d-puppet-v1",source:o.source||{mode:"generated-original"}},steps:sequence.steps.map(s=>({...s,op:"character.action"})),output:o.output||{},reconciliation:{mode:"external-effect-check",operationKeys:sequence.steps.map(s=>s.operationKey)},referenceAdapter:o.referenceAep?{mode:"external-reference",path:o.referenceAep,requiresUserInstalledProject:true,copyAssets:false}:null};
}
module.exports={toCharacterManifest};
