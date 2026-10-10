"use strict";
const crypto=require("crypto");
function stable(value){return JSON.stringify(value,Object.keys(value||{}).sort());}
function fingerprint(report){return crypto.createHash("sha256").update(JSON.stringify(report)).digest("hex");}
function normalizeInspection(raw){
 if(!raw||typeof raw!=="object") throw new Error("AE_PROJECT_REPORT_REQUIRED");
 const items=Array.isArray(raw.items)?raw.items:[];
 const comps=items.filter(x=>x&&x.type==="CompItem").map(c=>({
   id:c.id,name:String(c.name||""),width:Number(c.width)||0,height:Number(c.height)||0,duration:Number(c.duration)||0,
   frameRate:Number(c.frameRate)||0,layers:Array.isArray(c.layers)?c.layers.map(l=>({
     index:Number(l.index)||0,name:String(l.name||""),type:String(l.type||"Unknown"),parent:String(l.parent||""),
     enabled:l.enabled!==false,hasExpressions:!!l.hasExpressions,controls:Array.isArray(l.controls)?l.controls.map(String):[]
   })):[]
 }));
 const footage=items.filter(x=>x&&x.type!=="CompItem").map(x=>({id:x.id,name:String(x.name||""),type:String(x.type||"Unknown")}));
 const model={kind:"ae-project-inspection.v1",projectName:String(raw.projectName||"Untitled"),comps,footage};
 return {...model,fingerprint:fingerprint(model)};
}
module.exports={normalizeInspection,fingerprint};
