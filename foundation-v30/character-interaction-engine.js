"use strict";
const crypto=require("crypto");
const hash=v=>crypto.createHash("sha256").update(JSON.stringify(v)).digest("hex").slice(0,24);
const TYPES=["lookAt","faceTo","approach","distance","gestureSync","dialogueTurn","pointTo","follow","handoff","avoidance"];
const DEFAULTS={
  distance:{preferred:120,min:70,max:260,tolerance:8},
  approach:{speed:140,arrivalTolerance:6},
  lookAt:{maxTurn:55,smooth:0.65},
  faceTo:{maxTurn:90,smooth:0.55},
  gestureSync:{leadIn:0.18,leadOut:0.12},
  avoidance:{enabled:true,margin:24}
};
function n(v,d){return Number.isFinite(Number(v))?Number(v):d;}
function clone(v){return JSON.parse(JSON.stringify(v));}
function normalizeCharacter(c){if(!c||c.kind!=="original-character.v1"||!c.spec||!c.spec.id)throw new Error("INTERACTION_CHARACTER_REQUIRED");return c;}
function normalizeTarget(t){if(!t||!t.id)throw new Error("INTERACTION_TARGET_REQUIRED");return {id:String(t.id),position:{x:n(t.position&&t.position.x,0),y:n(t.position&&t.position.y,0)},radius:Math.max(0,n(t.radius,20))};}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
function interactionEnvelope({id,type,source,target,start=0,duration=1,priority=0,data={}}){if(!TYPES.includes(type))throw new Error("UNSUPPORTED_INTERACTION_TYPE");const env={kind:"character-interaction.v1",id:id||`${type}-${source.id}-${target.id}`,type,sourceCharacterId:source.id,targetId:target.id,start:n(start,0),duration:Math.max(.01,n(duration,1)),priority:n(priority,0),data};env.operationKey=hash(env);return env;}
function planCharacterInteractions({characters=[],interactions=[],fps=30,sceneDuration=5}={}){
 if(!Array.isArray(characters)||characters.length===0)throw new Error("INTERACTION_CHARACTERS_REQUIRED");
 const chars=characters.map(normalizeCharacter), byId=new Map(chars.map(c=>[c.spec.id,c]));
 const normalized=[];
 for(const raw of interactions){const s=byId.get(String(raw.sourceCharacterId||raw.source));if(!s)throw new Error("UNKNOWN_SOURCE_CHARACTER");const tid=String(raw.targetId||raw.targetCharacterId||"");if(!tid)throw new Error("INTERACTION_TARGET_ID_REQUIRED");const targetChar=byId.get(tid);const target=targetChar?{id:tid,position:raw.targetPosition||{x:0,y:0},radius:raw.targetRadius}:normalizeTarget({id:tid,position:raw.targetPosition,radius:raw.targetRadius});normalized.push(interactionEnvelope({id:raw.id,type:String(raw.type||"lookAt"),source:{id:s.spec.id},target,start:raw.start,duration:raw.duration,priority:raw.priority,data:clone(raw.data||{})}));}
 const timeline=normalized.slice().sort((a,b)=>a.start-b.start||b.priority-a.priority);
 const conflicts=[];
 for(let i=0;i<timeline.length;i++)for(let j=i+1;j<timeline.length;j++){const a=timeline[i],b=timeline[j];if(b.start>=a.start+a.duration)break;if(a.sourceCharacterId===b.sourceCharacterId&&a.type!==b.type&&a.priority===b.priority)conflicts.push({a:a.id,b:b.id,reason:"OVERLAPPING_SOURCE_INTERACTIONS"});}
 const plan={kind:"character-interaction-plan.v1",engine:"Character Interaction Engine",engineVersion:"1.0.0",fps:n(fps,30),sceneDuration:Math.max(.1,n(sceneDuration,5)),characters:chars.map(c=>c.spec.id),defaults:clone(DEFAULTS),interactions:timeline,conflicts,fingerprint:hash({characters:chars.map(c=>c.fingerprint),interactions:timeline,defaults:DEFAULTS})};
 validateCharacterInteractionPlan(plan);return plan;
}
function deriveDistanceInteraction({source,target,start=0,duration=1,preferred=DEFAULTS.distance.preferred}){const d=dist(source.position,target.position);return interactionEnvelope({type:"distance",source:{id:source.id},target:normalizeTarget(target),start,duration,data:{distance:Number(d.toFixed(4)),preferred:Number(preferred)}});}
function validateCharacterInteractionPlan(p){if(!p||p.kind!=="character-interaction-plan.v1")throw new Error("INVALID_INTERACTION_PLAN");if(!Array.isArray(p.characters)||!Array.isArray(p.interactions)||!Array.isArray(p.conflicts))throw new Error("INCOMPLETE_INTERACTION_PLAN");const ids=new Set(p.characters);for(const i of p.interactions){if(!ids.has(i.sourceCharacterId))throw new Error("UNKNOWN_INTERACTION_SOURCE");if(!i.operationKey)throw new Error("MISSING_INTERACTION_OPERATION_KEY");if(!TYPES.includes(i.type))throw new Error("UNSUPPORTED_INTERACTION_TYPE");if(i.start<0||i.duration<=0||i.start+i.duration>p.sceneDuration+1e-9)throw new Error("INTERACTION_OUT_OF_RANGE");}return true;}
module.exports={DEFAULTS,TYPES,interactionEnvelope,planCharacterInteractions,deriveDistanceInteraction,validateCharacterInteractionPlan};
