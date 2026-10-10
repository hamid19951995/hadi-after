"use strict";
const crypto=require("crypto");
const CONTROLLERS=[
  ["root","position"],["body","rotation"],["head","rotation"],
  ["leftArm","rotation"],["rightArm","rotation"],["leftHand","rotation"],
  ["rightHand","rotation"],["leftLeg","rotation"],["rightLeg","rotation"],
  ["leftFoot","rotation"],["rightFoot","rotation"]
];
const DEFAULTS={
  human2d:{
    version:"advanced-rig-engine.v1",orientation:"2d",interpolation:"bezier",
    controllers:Object.fromEntries(CONTROLLERS.map(([id,type])=>[id,{id,type,space:id==="root"?"world":"local",enabled:true}])),
    constraints:[
      {id:"head-follow-body",type:"rotation-limit",target:"head",min:-35,max:35,weight:1},
      {id:"arm-soft-limit-l",type:"rotation-limit",target:"leftArm",min:-150,max:150,weight:1},
      {id:"arm-soft-limit-r",type:"rotation-limit",target:"rightArm",min:-150,max:150,weight:1},
      {id:"leg-limit-l",type:"rotation-limit",target:"leftLeg",min:-55,max:55,weight:1},
      {id:"leg-limit-r",type:"rotation-limit",target:"rightLeg",min:-55,max:55,weight:1}
    ],
    solver:{iterations:12,tolerance:0.01,stabilize:true}
  }
};
function clone(v){return JSON.parse(JSON.stringify(v));}
function key(value){return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0,24);}
function num(v,d){return Number.isFinite(Number(v))?Number(v):d;}
function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
function controllerMap(profile){
  const base=clone(DEFAULTS[profile||"human2d"]||DEFAULTS.human2d);
  return base;
}
function inferAction(a){
  const name=String(a&& (a.action||a.name||"idle")).toLowerCase();
  const presets={
    idle:[["root",0,0],["body",0,0],["head",0,0]],
    walk:[["body",0,3],["leftArm",0,18],["rightArm",0,-18],["leftLeg",0,-28],["rightLeg",0,28]],
    wave:[["body",0,3],["rightArm",0,-55],["rightHand",0,35],["head",0,4]],
    talk:[["body",0,2],["head",0,8],["leftArm",0,8],["rightArm",0,-8]],
    run:[["body",0,7],["leftArm",0,35],["rightArm",0,-35],["leftLeg",0,-48],["rightLeg",0,48]]
  };
  return presets[name]||presets.idle;
}
function makeKeyframes(characterId, action, start, duration, values, fps){
  const frames=[]; const steps=Math.max(2,Math.round(duration*fps/4));
  for(let i=0;i<steps;i++){
    const t=i/(steps-1), time=start+duration*t;
    const ease=t*t*(3-2*t);
    for(const [controller,from,to] of values){
      const value=from+(to-from)*ease;
      frames.push({controller,time:Number(time.toFixed(4)),value:Number(value.toFixed(4)),
        operationKey:key({characterId,action,controller,time:Number(time.toFixed(4)),value:Number(value.toFixed(4))})});
    }
  }
  return frames;
}
function planAdvancedRig({character,scene,profile="human2d",actions,fps=30,duration}={}){
  if(!character||character.kind!=="original-character.v1") throw new Error("ADVANCED_RIG_CHARACTER_REQUIRED");
  const spec=controllerMap(profile); const rate=num(fps,30); const total=Math.max(0.1,num(duration,scene&&scene.duration||5));
  const source=Array.isArray(actions)&&actions.length?actions:(scene&&scene.characters&&scene.characters[0]&&scene.characters[0].actions)||[];
  const normalized=source.length?source:[{action:"idle",start:0,duration:total}];
  const keyframes=[];
  for(const a of normalized){
    const start=Math.max(0,num(a.start,0)), d=Math.max(0.05,Math.min(num(a.duration,1),total-start||0.05));
    keyframes.push(...makeKeyframes(character.spec.id,String(a.action||"idle"),start,d,inferAction(a),rate));
  }
  const bindings=Object.keys(spec.controllers).map(id=>({
    controllerId:id,layerName:id==="root"?"ROOT":id.replace(/([A-Z])/g," $1").replace(/^./,x=>x.toUpperCase()),
    characterId:character.spec.id,operationKey:key({characterId:character.spec.id,controllerId:id})
  }));
  const plan={kind:"advanced-rig-plan.v1",engine:"Advanced Rig Engine",engineVersion:"1.0.0",
    characterId:character.spec.id,duration:total,fps:rate,profile:spec.version,controllers:spec.controllers,
    constraints:spec.constraints,solver:spec.solver,bindings,keyframes,
    fingerprint:key({characterId:character.spec.id,controllers:spec.controllers,constraints:spec.constraints,solver:spec.solver,bindings,keyframes})};
  return plan;
}
function validateAdvancedRigPlan(plan){
  if(!plan||plan.kind!=="advanced-rig-plan.v1") throw new Error("INVALID_ADVANCED_RIG_PLAN");
  if(!plan.controllers||!plan.bindings||!Array.isArray(plan.keyframes)) throw new Error("INCOMPLETE_ADVANCED_RIG_PLAN");
  const ids=new Set(Object.keys(plan.controllers)); for(const b of plan.bindings) if(!ids.has(b.controllerId)) throw new Error("UNKNOWN_CONTROLLER");
  const keys=new Set(); for(const k of plan.keyframes){if(!k.operationKey||keys.has(k.operationKey)) throw new Error("DUPLICATE_KEYFRAME_OPERATION"); keys.add(k.operationKey);}
  if(!Number.isFinite(plan.fps)||plan.fps<=0||plan.duration<=0) throw new Error("INVALID_TIMING");
  return true;
}
module.exports={DEFAULTS,planAdvancedRig,validateAdvancedRigPlan};
