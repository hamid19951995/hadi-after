"use strict";
const fs=require("fs"),path=require("path"),os=require("os");
const {PersistentOperationJournalV3}=require("../foundation-v8/journal/persistent-operation-journal-v3");
const {sha256}=require("../kernel/crypto/canonical");
function migrateJournal(input,output){
 if(!fs.existsSync(input)) throw new Error(`SOURCE_NOT_FOUND: ${input}`);
 if(fs.existsSync(output)) throw new Error(`DESTINATION_EXISTS: ${output}`);
 const rows=fs.readFileSync(input,"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
 const j=new PersistentOperationJournalV3({file:output});
 for(const r of rows){const op={operationId:r.operationId,action:r.action,target:r.target,parameters:r.parameters,expectedState:r.expectedState,state:r.state,attempt:r.attempt||0};j.append(op,"MIGRATED_V7_RECORD",{sourceSchema:r.schemaVersion||"unknown",sourceSeq:r.seq,sourceHash:r.hash,sourceEvent:r.event,sourceState:r.state,sourceData:r.data||null});}
 return {records:rows.length,output,sourceDigest:sha256(rows)};
}
if(require.main===module){const [input,output]=process.argv.slice(2);if(!input||!output){console.error("Usage: node tools/migrate-v7-to-v8.js <v7-journal.ndjson> <v8-journal.ndjson>");process.exit(2);}console.log(JSON.stringify(migrateJournal(path.resolve(input),path.resolve(output)),null,2));}
module.exports={migrateJournal};
