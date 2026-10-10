'use strict';
const REQUIRED=['comp','width','height','duration','frameRate','output'];
function assertPath(v,name){if(typeof v!=='string'||!v.trim())throw new Error(`manifest.${name} required`); if(/[\0]/.test(v))throw new Error(`manifest.${name} contains NUL`); return v;}
function validate(spec){
 if(!spec||typeof spec!=='object'||Array.isArray(spec))throw new Error('manifest must be an object');
 for(const k of REQUIRED)if(spec[k]===undefined||spec[k]===null||spec[k]==='')throw new Error(`manifest.${k} required`);
 const num=['width','height','duration','frameRate']; for(const k of num){const n=Number(spec[k]);if(!Number.isFinite(n)||n<=0)throw new Error(`invalid manifest.${k}`);}
 if(spec.width<16||spec.height<16)throw new Error('invalid comp dimensions');
 const layers=Array.isArray(spec.layers)?spec.layers:[];
 if(!layers.length && !spec.layer)throw new Error('manifest.layer or manifest.layers required');
 const normalizedLayers=layers.length?layers.map((x,i)=>{if(!x||typeof x!=='object')throw new Error(`invalid layers[${i}]`);if(!x.name)throw new Error(`layers[${i}].name required`);return {...x,type:x.type||'solid'};}):[{name:spec.layer,type:'solid',color:spec.color||[0,0,0]}];
 const keyframes=Array.isArray(spec.keyframes)?spec.keyframes:[];
 keyframes.forEach((k,i)=>{if(!k||!Number.isFinite(Number(k.time))||Number(k.time)<0||Number(k.time)>Number(spec.duration))throw new Error(`invalid keyframes[${i}].time`);if(k.value===undefined)throw new Error(`keyframes[${i}].value required`);});
 assertPath(String(spec.output),'output'); if(spec.projectPath)assertPath(String(spec.projectPath),'projectPath');
 return {...spec,width:Number(spec.width),height:Number(spec.height),duration:Number(spec.duration),frameRate:Number(spec.frameRate),jobId:spec.jobId||null,layers:normalizedLayers,keyframes,folders:Array.isArray(spec.folders)?spec.folders:[],assets:Array.isArray(spec.assets)?spec.assets:(spec.asset?[spec.asset]:[]),retry:{maxAttempts:Math.max(1,Math.min(5,Number(spec.retry&&spec.retry.maxAttempts)||1))}};
}
module.exports={validate};
