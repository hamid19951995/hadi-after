'use strict';
const REQUIRED=['comp','width','height','duration','frameRate','layer','output'];
function validate(spec){if(!spec||typeof spec!=='object')throw new Error('manifest must be an object');for(const k of REQUIRED)if(spec[k]===undefined||spec[k]===null||spec[k]==='')throw new Error(`manifest.${k} required`);if(spec.width<=0||spec.height<=0||spec.duration<=0||spec.frameRate<=0)throw new Error('invalid comp dimensions/timing');return {...spec,jobId:spec.jobId||null,keyframes:Array.isArray(spec.keyframes)?spec.keyframes:[],folders:Array.isArray(spec.folders)?spec.folders:[]};}
module.exports={validate};
