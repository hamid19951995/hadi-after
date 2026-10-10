"use strict";
const fs=require("fs"),path=require("path");
const {sha256,canonicalize}=require("../../kernel/crypto/canonical");
class EvidenceLedgerV2{
 constructor({clock=()=>Date.now()}={}){this.clock=clock;}
 append(chain,event,data={}){
  const prev=chain.length?chain[chain.length-1].hash:"0".repeat(64);
  const item={seq:chain.length+1,at:new Date(this.clock()).toISOString(),event,data,prevHash:prev};
  item.hash=sha256(canonicalize(item)); chain.push(Object.freeze(item)); return item;
 }
 verify(chain){
  let prev="0".repeat(64);
  for(let i=0;i<chain.length;i++){
   const x=chain[i],copy={seq:x.seq,at:x.at,event:x.event,data:x.data,prevHash:x.prevHash};
   if(x.seq!==i+1||x.prevHash!==prev||sha256(canonicalize(copy))!==x.hash)return false;
   prev=x.hash;
  } return true;
 }
 persist(file,chain){fs.mkdirSync(path.dirname(file),{recursive:true});const payload={schemaVersion:"2.0.0",chain};const record={...payload,recordSha256:sha256(payload)};fs.writeFileSync(file,JSON.stringify(record,null,2),"utf8");return record.recordSha256;}
}
module.exports={EvidenceLedgerV2};