"use strict";
const crypto=require("crypto");
const v23=require("../foundation-v23");
const catalog=require("./motion-catalog");
const planner=require("./scene-planner");
const adapter=require("./ae-manifest-adapter");

function createCreativeBrief(input){
  const transcript=v23.normalizeTranscript(input&&input.text||input&&input.transcript||"");
  if(!transcript) throw new Error("CREATIVE_BRIEF_TEXT_REQUIRED");
  const language=input&&input.language||v23.detectLanguage(transcript);
  const family=planner.detectFamily(transcript,language,input&&input.family);
  const style=planner.detectStyle(transcript,language,input&&input.style);
  const duration=planner.detectDuration(transcript,input&&input.duration||12);
  return {id:input&&input.id||"brief-"+crypto.createHash("sha1").update(transcript).digest("hex").slice(0,12),text:transcript,language,family,style,duration,format:input&&input.format||"1920x1080",source:input&&input.source||"text"};
}
function planCreativeJob(input){
  const brief=createCreativeBrief(input);
  const scene=planner.planScene(brief,input&&input.options||{});
  const manifest=adapter.toAutonomousManifest(scene,brief,input&&input.output||{});
  return {brief,scene,manifest,capabilities:catalog.capabilities(scene.family)};
}
function planFromVoice(envelope,options){
  const intent=v23.voiceToJobIntent(envelope);
  return planCreativeJob({text:intent.text,language:intent.language,source:"voice",...(options||{})});
}
function createVariations(input,count){
  count=Math.max(1,Math.min(6,Number(count)||3));
  const base=createCreativeBrief(input); const styles=planner.variationStyles(base.style,count);
  return styles.map((style,i)=>planCreativeJob({...input,text:base.text,language:base.language,style,output:{...(input&&input.output||{}),suffix:"v"+(i+1)}}));
}
module.exports={...v23,...catalog,...planner,...adapter,createCreativeBrief,planCreativeJob,planFromVoice,createVariations};
