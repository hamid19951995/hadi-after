"use strict";
const fs=require("fs"),path=require("path");
const {sha256,canonicalize}=require("../kernel/crypto/canonical");

class PersistentOperationJournalV2{
 constructor({file=".aeboss/operation-journal-v2.ndjson",clock=()=>Date.now()}={}){
  this.file=file;this.clock=clock;fs.mkdirSync(path.dirname(file),{recursive:true});
  this._lastHash=this._readLastHash();
 }
 _readLastHash(){try{const rows=this.readAll();return rows.at(-1)?.hash||"0".repeat(64);}catch{return "0".repeat(64);}}
 append(operation,event,data={}){
  const record={schemaVersion:"2.0.0",seq:this.readAll().length+1,operationId:operation.operationId,
   action:operation.action||null,target:operation.target||null,parameters:operation.parameters||null,
   expectedState:operation.expectedState,event,at:new Date(this.clock()).toISOString(),state:operation.state,
   data,attempt:operation.attempt||0,prevHash:this._lastHash};
  record.hash=sha256(canonicalize(record));fs.appendFileSync(this.file,JSON.stringify(record)+"\n","utf8");
  this._lastHash=record.hash;return record;
 }
 readAll(){if(!fs.existsSync(this.file))return [];return fs.readFileSync(this.file,"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);}
 verify(){
  let ok=true,prev="0".repeat(64),lastByOperation=new Map(),expectedSeq=1;
  for(const r of this.readAll()){
   const copy={...r};delete copy.hash;
   if(r.seq!==expectedSeq||r.prevHash!==prev||sha256(canonicalize(copy))!==r.hash)ok=false;
   prev=r.hash;expectedSeq++;
   lastByOperation.set(r.operationId,r);
  }
  return {ok,operations:lastByOperation.size,lastByOperation:Object.fromEntries([...lastByOperation].map(([k,v])=>[k,v.state]))};
 }
 load(operationId){
  const rows=this.readAll().filter(x=>x.operationId===operationId);if(!rows.length)return null;
  const last=rows.at(-1);
  return {operationId,lastState:last.state,state:last.state,attempt:last.attempt,events:rows};
 }
}
module.exports={PersistentOperationJournalV2};
