"use strict";
const {normalizeInspection}=require("./project-model");
const ROLE_PATTERNS={
 head:[/head|face|سر|صورت/i],body:[/body|torso|chest|بدن|تنه/i],leftArm:[/left.*arm|arm.*left|بازوی.*چپ|دست.*چپ/i],rightArm:[/right.*arm|arm.*right|بازوی.*راست|دست.*راست/i],leftLeg:[/left.*leg|leg.*left|پای.*چپ|پا.*چپ/i],rightLeg:[/right.*leg|leg.*right|پای.*راست|پا.*راست/i],root:[/root|master|control|controller|کنترل|ریشه/i]
};
const ACTION_WORDS=["idle","walk","run","talk","point","wave","think","sit","stand","present","enter","exit","celebrate","greet"];
function classifyComp(comp){
 const layers=comp.layers||[]; const roles={}; const controllers=[];
 for(const l of layers){
   for(const role of Object.keys(ROLE_PATTERNS)) if(!roles[role]&&ROLE_PATTERNS[role].some(r=>r.test(l.name))) roles[role]=l.name;
   if(/control|controller|root|master|null|کنترل/i.test(l.name)||l.controls.length) controllers.push(l.name);
 }
 const actions=ACTION_WORDS.filter(a=>new RegExp(a,"i").test(comp.name));
 const score=Object.keys(roles).length*3+controllers.length+(layers.some(l=>l.hasExpressions)?2:0);
 return {comp:comp.name,roles,controllers,actions,score};
}
function analyzeCharacterProject(raw){
 const model=normalizeInspection(raw);
 const candidates=model.comps.map(classifyComp).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.comp.localeCompare(b.comp));
 const primary=candidates[0]||null;
 const actionComps=model.comps.filter(c=>ACTION_WORDS.some(a=>new RegExp(a,"i").test(c.name))).map(c=>c.name);
 return {kind:"character-project-intelligence.v1",sourceFingerprint:model.fingerprint,primaryRigCandidate:primary,rigCandidates:candidates,actionCompositions:actionComps,project:model};
}
module.exports={analyzeCharacterProject,classifyComp,ROLE_PATTERNS};
