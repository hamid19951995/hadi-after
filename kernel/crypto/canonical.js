"use strict";
const crypto=require("crypto");
function canonicalize(v){if(v===null||typeof v!=="object")return JSON.stringify(v);if(Array.isArray(v))return "["+v.map(canonicalize).join(",")+"]";return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canonicalize(v[k])).join(",")+"}";}
function sha256(v){return crypto.createHash("sha256").update(typeof v==='string'?v:canonicalize(v),"utf8").digest("hex");}
module.exports={canonicalize,sha256};
