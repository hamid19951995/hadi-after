"use strict";
const crypto=require("crypto");
const ACTIONS=["pickUp","attach","carry","use","place","handoff","detach","drop"];
const STATE_VALUES=["world","held","attached","placed","used","dropped"];
const PROP_TYPES=["generic","tool","phone","cup","book","box","ball","chair","table","sign","document","device"];
const EXCLUSIVE_ACTIONS=new Set(["pickUp","attach","carry","use","place","handoff","detach","drop"]);
const DEFAULTS={
  proximity:{pickupRadius:80,interactionRadius:110,placementTolerance:24,handoffRadius:95},
  state:{initial:"world",strict:true},
  anchors:{defaultSource:"rightHand",defaultTarget:"root"},
  physics:{enabled:false,gravity:980,damping:0.85}
};
function clone(v){return JSON.parse(JSON.stringify(v));}
function hash(v){return crypto.createHash("sha256").update(JSON.stringify(v)).digest("hex").slice(0,24);}
function num(v,d){return Number.isFinite(Number(v))?Number(v):d;}
function bool(v,d){return typeof v==="boolean"?v:d;}
function ensureId(v,code){const id=String(v==null?"":v).trim();if(!id)throw new Error(code);return id;}
function point(v){return {x:num(v&&v.x,0),y:num(v&&v.y,0),z:num(v&&v.z,0)};}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);}
function normalizeProp(raw={}){
  const spec=raw.spec||raw;
  const id=ensureId(spec.id,"PROP_ID_REQUIRED");
  const type=String(spec.type||"generic");
  if(!PROP_TYPES.includes(type)) throw new Error("UNSUPPORTED_PROP_TYPE");
  const state=String(spec.initialState||"world");
  if(!STATE_VALUES.includes(state)) throw new Error("INVALID_PROP_INITIAL_STATE");
  const anchors=Array.isArray(spec.interactionPoints)?spec.interactionPoints:[];
  return {
    kind:"intelligent-prop.v1",spec:{
      id,type,name:String(spec.name||id),position:point(spec.position),radius:Math.max(0,num(spec.radius,24)),
      mass:Math.max(0,num(spec.mass,1)),grabbable:spec.grabbable!==false,
      interactable:spec.interactable!==false,initialState:state,initialHolderCharacterId:spec.initialHolderCharacterId?String(spec.initialHolderCharacterId):null,
      affordances:Array.from(new Set((Array.isArray(spec.affordances)?spec.affordances:[]).map(String))),
      interactionPoints:anchors.map((a,i)=>({id:String(a.id||`anchor-${i+1}`),position:point(a.position),controller:String(a.controller||DEFAULTS.anchors.defaultSource)})),
      metadata:clone(spec.metadata||{})
    },fingerprint:hash({id,type,name:String(spec.name||id),position:point(spec.position),radius:num(spec.radius,24),mass:num(spec.mass,1),affordances:spec.affordances||[],interactionPoints:anchors})
  };
}
function normalizeCharacter(raw){
  if(!raw||raw.kind!=="original-character.v1"||!raw.spec||!raw.spec.id) throw new Error("PROP_CHARACTER_REQUIRED");
  return raw;
}
function normalizeAction(raw, chars, props, sceneDuration){
  const type=String(raw.action||raw.type||"");
  if(!ACTIONS.includes(type)) throw new Error("UNSUPPORTED_PROP_ACTION");
  const sourceCharacterId=ensureId(raw.sourceCharacterId||raw.characterId,"PROP_SOURCE_CHARACTER_REQUIRED");
  if(!chars.has(sourceCharacterId)) throw new Error("UNKNOWN_PROP_SOURCE_CHARACTER");
  const propId=ensureId(raw.propId||raw.targetPropId,"PROP_TARGET_REQUIRED");
  const prop=props.get(propId); if(!prop) throw new Error("UNKNOWN_PROP");
  if(!prop.spec.interactable) throw new Error("PROP_NOT_INTERACTABLE");
  if(["pickUp","carry","handoff"].includes(type)&&!prop.spec.grabbable) throw new Error("PROP_NOT_GRABBABLE");
  const targetCharacterId=raw.targetCharacterId?ensureId(raw.targetCharacterId,"PROP_TARGET_CHARACTER_REQUIRED"):null;
  if(targetCharacterId&&!chars.has(targetCharacterId)) throw new Error("UNKNOWN_PROP_TARGET_CHARACTER");
  const start=Math.max(0,num(raw.start,0));
  const duration=Math.max(0.01,num(raw.duration,1));
  if(start+duration>sceneDuration+1e-9) throw new Error("PROP_ACTION_OUT_OF_RANGE");
  const targetPosition=point(raw.targetPosition);
  const envelope={
    kind:"character-prop-action.v1",id:String(raw.id||`${type}-${sourceCharacterId}-${propId}-${start}`),action:type,
    sourceCharacterId,propId,targetCharacterId,start,duration,priority:num(raw.priority,0),
    sourceController:String(raw.sourceController||DEFAULTS.anchors.defaultSource),targetController:String(raw.targetController||DEFAULTS.anchors.defaultTarget),
    targetPosition,data:clone(raw.data||{})
  };
  envelope.operationKey=hash(envelope); return envelope;
}
function nextState(state,action){
  const transitions={world:{pickUp:"held",attach:"attached",drop:"dropped",place:"placed"},held:{carry:"held",use:"used",place:"placed",handoff:"held",drop:"dropped",attach:"attached"},attached:{carry:"attached",use:"used",detach:"world",drop:"dropped"},used:{carry:"held",place:"placed",drop:"dropped",attach:"attached"},placed:{pickUp:"held",attach:"attached",drop:"dropped",use:"used"},dropped:{pickUp:"held",attach:"attached",place:"placed"}};
  const ns=transitions[state]&&transitions[state][action]; if(!ns) throw new Error(`INVALID_PROP_STATE_TRANSITION:${state}:${action}`); return ns;
}
function transitionFor(state,action,currentHolder,targetCharacterId,sourceCharacterId){
  const next=nextState(state,action);
  if(["pickUp","attach","carry","use","place","detach","drop"].includes(action)&&currentHolder&&currentHolder!==sourceCharacterId) throw new Error("PROP_HOLDER_MISMATCH");
  if(["carry","use","place","detach","drop"].includes(action)&&!currentHolder&&action!=="drop") throw new Error("PROP_HOLDER_REQUIRED");
  let holder=currentHolder||null;
  if(action==="pickUp"||action==="attach") holder=sourceCharacterId;
  if(action==="handoff") holder=String(targetCharacterId||"");
  if(action==="place"||action==="drop"||action==="detach") holder=null;
  return {state:next,holder};
}
function compilePropTimeline(props, actions){
  const stateByProp=new Map(), holderByProp=new Map();
  props.forEach(p=>{stateByProp.set(p.spec.id,p.spec.initialState);holderByProp.set(p.spec.id,p.spec.initialHolderCharacterId||null);});
  const timeline=[];
  const sorted=actions.slice().sort((a,b)=>a.start-b.start||b.priority-a.priority||a.id.localeCompare(b.id));
  const active=[];
  for(const action of sorted){
    for(let i=active.length-1;i>=0;i--) if(active[i].start+active[i].duration<=action.start) active.splice(i,1);
    for(const other of active){
      const sameProp=other.propId===action.propId, sameSource=other.sourceCharacterId===action.sourceCharacterId;
      if((sameProp||sameSource)&&other.priority===action.priority) throw new Error("PROP_TIMELINE_CONFLICT");
    }
    const before=stateByProp.get(action.propId), holderBefore=holderByProp.get(action.propId);
    const tr=transitionFor(before,action.action,holderBefore,action.targetCharacterId,action.sourceCharacterId);
    const compiled={...action,stateBefore:before,stateAfter:tr.state,holderBefore:holderBefore||null,holderAfter:tr.holder||null,
      anchor:{sourceController:action.sourceController,targetController:action.targetController},compiledKey:hash({action,before,after:tr.state,holderBefore,holderAfter:tr.holder})};
    timeline.push(compiled);stateByProp.set(action.propId,tr.state);holderByProp.set(action.propId,tr.holder);active.push(action);
  }
  return {timeline,finalStates:Object.fromEntries(stateByProp),finalHolders:Object.fromEntries(holderByProp)};
}

function planCharacterPropIntelligence({characters=[],props=[],actions=[],fps=30,sceneDuration=5}={}){
  if(!Array.isArray(characters)||characters.length===0) throw new Error("PROP_CHARACTERS_REQUIRED");
  if(!Array.isArray(props)||props.length===0) throw new Error("PROPS_REQUIRED");
  const chars=characters.map(normalizeCharacter), propsN=props.map(normalizeProp);
  const charMap=new Map(chars.map(c=>[c.spec.id,c])); const propMap=new Map(propsN.map(p=>[p.spec.id,p]));
  if(propMap.size!==propsN.length) throw new Error("DUPLICATE_PROP_ID");
  const duration=Math.max(0.1,num(sceneDuration,5));
  const normalized=actions.map(a=>normalizeAction(a,charMap,propMap,duration));
  const compiled=compilePropTimeline(propsN,normalized);
  const attachments=compiled.timeline.filter(a=>["attach","carry","handoff"].includes(a.action)).map(a=>({id:a.id,propId:a.propId,characterId:a.sourceCharacterId,targetCharacterId:a.targetCharacterId||null,controller:a.sourceController,operationKey:hash({id:a.id,propId:a.propId,characterId:a.sourceCharacterId,controller:a.sourceController})}));
  const plan={
    kind:"character-prop-intelligence-plan.v1",engine:"Character + Prop Intelligence",engineVersion:"1.0.0",fps:num(fps,30),sceneDuration:duration,
    characters:chars.map(c=>c.spec.id),props:propsN.map(p=>p.spec),defaults:clone(DEFAULTS),actions:compiled.timeline,attachments,conflicts:compiled.timeline.length?[]:[],
    stateModel:{states:STATE_VALUES,strict:DEFAULTS.state.strict,finalStates:compiled.finalStates,finalHolders:compiled.finalHolders},
    fingerprint:hash({characters:chars.map(c=>c.fingerprint),props:propsN,actions:compiled.timeline,attachments,defaults:DEFAULTS})
  };
  plan.conflicts=detectConflicts(plan.actions);
  validateCharacterPropPlan(plan); return plan;
}
function detectConflicts(actions){
  const conflicts=[]; const sorted=actions.slice().sort((a,b)=>a.start-b.start||a.id.localeCompare(b.id));
  for(let i=0;i<sorted.length;i++)for(let j=i+1;j<sorted.length;j++){
    const a=sorted[i],b=sorted[j]; if(b.start>=a.start+a.duration) break;
    if((a.propId===b.propId||a.sourceCharacterId===b.sourceCharacterId)&&(a.priority===b.priority)) conflicts.push({a:a.id,b:b.id,reason:a.propId===b.propId?"OVERLAPPING_PROP_MUTATION":"OVERLAPPING_CHARACTER_PROP_ACTION"});
  }
  const seen=new Set(); return conflicts.filter(c=>{const k=[c.a,c.b,c.reason].sort().join("|");if(seen.has(k))return false;seen.add(k);return true;});
}
function inferPropActions({text="",characterId,propId,targetCharacterId,start=0,duration=1}={}){
  const t=String(text).toLowerCase(); const out=[];
  const add=(action,s=0,d=duration,data={})=>out.push({id:`inferred-${action}-${s}`,action,sourceCharacterId:characterId,propId,targetCharacterId,start:s,duration:d,data});
  if(/pick|بردار|برداش|گرفتن|بگیر/.test(t)) add("pickUp",start,duration);
  else if(/carry|حمل|ببر|با خود/.test(t)) add("carry",start,duration);
  else if(/use|استفاده|کار با/.test(t)) add("use",start,duration);
  else if(/place|بگذار|قرار بده|روی میز/.test(t)) add("place",start,duration);
  else if(/handoff|تحویل|بده به/.test(t)) add("handoff",start,duration);
  else if(/attach|وصل|متصل/.test(t)) add("attach",start,duration);
  else if(/detach|جدا/.test(t)) add("detach",start,duration);
  else if(/drop|بینداز/.test(t)) add("drop",start,duration);
  return out;
}
function validateCharacterPropPlan(p){
  if(!p||p.kind!=="character-prop-intelligence-plan.v1") throw new Error("INVALID_CHARACTER_PROP_PLAN");
  if(!Array.isArray(p.characters)||!Array.isArray(p.props)||!Array.isArray(p.actions)||!Array.isArray(p.attachments)||!Array.isArray(p.conflicts)) throw new Error("INCOMPLETE_CHARACTER_PROP_PLAN");
  const chars=new Set(p.characters), props=new Map(p.props.map(x=>[x.id,x])), keys=new Set();
  if(!Number.isFinite(p.fps)||p.fps<=0||!Number.isFinite(p.sceneDuration)||p.sceneDuration<=0) throw new Error("INVALID_PROP_PLAN_TIMING");
  for(const x of p.props){if(!x.id||props.get(x.id)!==x)throw new Error("INVALID_PROP");if(!STATE_VALUES.includes(x.initialState))throw new Error("INVALID_PROP_STATE");}
  const stateByProp=new Map(p.props.map(x=>[x.id,x.initialState]));
  const holderByProp=new Map(p.props.map(x=>[x.id,x.initialHolderCharacterId||null]));
  for(const x of p.props) if(x.initialHolderCharacterId&&!chars.has(x.initialHolderCharacterId)) throw new Error("BROKEN_INITIAL_HOLDER_REFERENCE");
  for(const a of p.actions){
    if(!ACTIONS.includes(a.action)) throw new Error("UNSUPPORTED_PROP_ACTION");
    if(!chars.has(a.sourceCharacterId)||!props.has(a.propId)) throw new Error("BROKEN_PROP_REFERENCE");
    if(a.targetCharacterId&&!chars.has(a.targetCharacterId)) throw new Error("BROKEN_TARGET_CHARACTER_REFERENCE");
    if(a.start<0||a.duration<=0||a.start+a.duration>p.sceneDuration+1e-9) throw new Error("PROP_ACTION_OUT_OF_RANGE");
    if(!a.operationKey||!a.compiledKey||keys.has(a.operationKey)) throw new Error("INVALID_PROP_OPERATION_KEY");
    keys.add(a.operationKey);
    const beforeState=stateByProp.get(a.propId), beforeHolder=holderByProp.get(a.propId);
    const tr=transitionFor(beforeState,a.action,beforeHolder,a.targetCharacterId,a.sourceCharacterId);
    if(tr.state!==a.stateAfter||a.stateBefore!==beforeState||((a.holderBefore||null)!==(beforeHolder||null))||((a.holderAfter||null)!==(tr.holder||null))) throw new Error("PROP_STATE_SEQUENCE_INVALID");
    if(a.action==="handoff"&&!a.targetCharacterId) throw new Error("HANDOFF_TARGET_REQUIRED");
    stateByProp.set(a.propId,a.stateAfter); holderByProp.set(a.propId,a.holderAfter||null);
  }
  if(JSON.stringify(Object.fromEntries(stateByProp))!==JSON.stringify(p.stateModel.finalStates)) throw new Error("PROP_FINAL_STATE_MISMATCH");
  if(JSON.stringify(Object.fromEntries(holderByProp))!==JSON.stringify(p.stateModel.finalHolders)) throw new Error("PROP_FINAL_HOLDER_MISMATCH");
  return true;
}
module.exports={ACTIONS,STATE_VALUES,PROP_TYPES,DEFAULTS,normalizeProp,planCharacterPropIntelligence,inferPropActions,detectConflicts,validateCharacterPropPlan};
