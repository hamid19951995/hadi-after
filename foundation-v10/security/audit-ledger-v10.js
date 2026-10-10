"use strict";
const fs=require("fs"),crypto=require("crypto");
class AuditLedgerV10{
 constructor({file}={}){if(!file)throw new TypeError("file required");this.file=file;this.seq=0;this.prev="GENESIS";if(fs.existsSync(file)){for(const line of fs.readFileSync(file,"utf8").split(/\r?\n/).filter(Boolean)){const r=JSON.parse(line);this.seq=r.seq;this.prev=r.hash;}}}
 append(type,data){const row={seq:++this.seq,at:new Date().toISOString(),type,data,prevHash:this.prev};row.hash=crypto.createHash("sha256").update(JSON.stringify(row)).digest("hex");fs.appendFileSync(this.file,JSON.stringify(row)+"\n");this.prev=row.hash;return row;}
 verify(){let prev="GENESIS",seq=0;for(const line of fs.readFileSync(this.file,"utf8").split(/\r?\n/).filter(Boolean)){const r=JSON.parse(line);if(r.seq!==++seq||r.prevHash!==prev)return {ok:false,reason:"CHAIN_BROKEN",seq:r.seq};const copy={seq:r.seq,at:r.at,type:r.type,data:r.data,prevHash:r.prevHash};const h=crypto.createHash("sha256").update(JSON.stringify(copy)).digest("hex");if(h!==r.hash)return {ok:false,reason:"HASH_MISMATCH",seq:r.seq};prev=r.hash;}return {ok:true,entries:seq};}
}
module.exports={AuditLedgerV10};
