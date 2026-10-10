"use strict";
const crypto=require("crypto");
const stable=v=>JSON.stringify(v,Object.keys(v).sort());
const hash=v=>crypto.createHash("sha256").update(stable(v)).digest("hex");
const PALETTES={modern:{skin:"#D6A07C",shirt:"#2D6CDF",pants:"#263238",hair:"#2B2118"},corporate:{skin:"#C98B6B",shirt:"#1E3A5F",pants:"#455A64",hair:"#34251F"},minimal:{skin:"#D8A98A",shirt:"#607D8B",pants:"#37474F",hair:"#2F2F2F"}};
function normalize(input={}){
 const style=input.style||"modern"; const palette={...(PALETTES[style]||PALETTES.modern),...(input.palette||{})};
 return {kind:"original-character-spec.v1",id:input.id||"character-1",style,bodyType:input.bodyType||"standard",hairStyle:input.hairStyle||"short",outfit:input.outfit||"casual",palette,scale:Number(input.scale||100),metadata:{original:true,referenceAssetReuse:false}};
}
function generateCharacter(input={}){
 const spec=normalize(input); const parts=[
  ["ROOT", "control"],["Body","shape"],["Head","shape"],["Hair","shape"],["Left Arm","shape"],["Right Arm","shape"],["Left Hand","shape"],["Right Hand","shape"],["Left Leg","shape"],["Right Leg","shape"],["Left Foot","shape"],["Right Foot","shape"]
 ].map(([name,kind],i)=>({id:`${spec.id}:${name.toLowerCase().replace(/ /g,"-")}`,name,kind,order:i,operationKey:hash({character:spec.id,name})}));
 const hierarchy={"Body":"ROOT","Head":"Body","Hair":"Head","Left Arm":"Body","Right Arm":"Body","Left Hand":"Left Arm","Right Hand":"Right Arm","Left Leg":"ROOT","Right Leg":"ROOT","Left Foot":"Left Leg","Right Foot":"Right Leg"};
 return {kind:"original-character.v1",spec,parts,hierarchy,fingerprint:hash({spec,parts,hierarchy})};
}
function validateCharacter(c){ if(!c||c.kind!=="original-character.v1") throw new Error("INVALID_CHARACTER"); if(new Set(c.parts.map(p=>p.operationKey)).size!==c.parts.length) throw new Error("DUPLICATE_OPERATION_KEY"); return true; }
module.exports={PALETTES,normalize,generateCharacter,validateCharacter};
