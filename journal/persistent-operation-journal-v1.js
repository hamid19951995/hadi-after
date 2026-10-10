"use strict";
const fs=require("fs"),path=require("path");
const {sha256,canonicalize}=require("../kernel/crypto/canonical");
class PersistentOperationJournalV1{
 constructor({file=".aeboss/operation-journal.ndjson",clock=()=>Date.now()}={}){this.file=file;this.clock=clock;fs.mkdirSync(path.dirname(file),{recursive:true});}
 append(operation,event,data={}){const record={operationId:operation.operationId,action:operation.action||null,target:operation.target||null,parameters:operation.parameters||null,expectedState:operation.expectedState,event,at:new Date(this.clock()).toISOString(),state:operation.state,data,attempt:operation.attempt||0};record.hash=sha256(canonicalize(record));fs.appendFileSync(this.file,JSON.stringify(record)+"\n","utf8");return record;}
 readAll(){if(!fs.existsSync(this.file))return [];return fs.readFileSync(this.file,"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);}
 load(operationId){const rows=this.readAll().filter(x=>x.operationId===operationId);if(!rows.length)return null;const last=rows.at(-1);return {operationId,lastState:last.state,state:last.state,attempt:last.attempt,events:rows};}
 verify(){let ok=true,lastByOp=new Map();for(const r of this.readAll()){const copy={operationId:r.operationId,action:r.action,target:r.target,parameters:r.parameters,expectedState:r.expectedState,event:r.event,at:r.at,state:r.state,data:r.data,attempt:r.attempt};if(sha256(canonicalize(copy))!==r.hash)ok=false;lastByOp.set(r.operationId,r);}return {ok,operations:lastByOp.size,lastByOperation:Object.fromEntries([...lastByOp].map(([k,v])=>[k,v.state]))};}
}
module.exports={PersistentOperationJournalV1};
