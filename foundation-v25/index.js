"use strict";
const v24=require("../foundation-v24");
const catalog=require("./character-catalog"); const intent=require("./character-intent"); const seq=require("./action-sequencer"); const rig=require("./rig-schema"); const adapter=require("./ae-character-adapter");
function planCharacterJob(input){
 const base=intent.detectCharacterIntent(input&&input.text||input&&input.transcript||"");
 const merged={...base,actions:input&&input.actions||base.actions,duration:input&&input.duration||base.duration,character:input&&input.character||base.character};
 const sequence=seq.sequence(merged); rig.validateRigPlan(sequence); const manifest=adapter.toCharacterManifest(sequence,input&&input.options||{});
 return {intent:merged,sequence,manifest,rig:rig.rigSchema,capabilities:catalog.actions()};
}
function planCharacterFromVoice(envelope,options){const intent=v24.voiceToJobIntent(envelope); return planCharacterJob({text:intent.text,options:options||{}});}
module.exports={...v24,...catalog,...intent,...seq,...rig,...adapter,planCharacterJob,planCharacterFromVoice};
