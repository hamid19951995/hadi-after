"use strict";
const {normalizeAction}=require("./character-catalog");
function clean(s){return String(s||"").replace(/\s+/g," ").trim();}
function detectCharacterIntent(text){
 const t=clean(text); if(!t) throw new Error("CHARACTER_INTENT_TEXT_REQUIRED");
 const actionWords=["walk","talk","point","wave","think","celebrate","present","enter","exit","راه برو","صحبت","اشاره","دست تکان","فکر","جشن","معرفی","ورود","خروج"];
 const mentions=actionWords.filter(x=>t.toLowerCase().indexOf(x.toLowerCase())>=0);
 const found=[]; for(const m of mentions){const a=normalizeAction(m); if(a&&!found.includes(a)) found.push(a);}
 if(!found.length) found.push("present");
 const seconds=Array.from(t.matchAll(/(\d+(?:\.\d+)?)\s*(?:ثانیه|second|sec)/gi)).map(m=>Number(m[1]));
 return {kind:"character-intent.v1",text:t,actions:found,duration:seconds[0]||Math.max(4,found.length*2),character:"ae-boss-puppet-v1"};
}
module.exports={detectCharacterIntent};
