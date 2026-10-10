"use strict";const {sha256}=require("../kernel/crypto/canonical");
function append(chain,event,data={}){const prev=chain.length?chain[chain.length-1].hash:"GENESIS";const item={seq:chain.length+1,at:new Date().toISOString(),event,data,prevHash:prev};item.hash=sha256(item);chain.push(item);return item;}
function verify(chain){let prev="GENESIS";for(let i=0;i<chain.length;i++){const item=chain[i];if(item.seq!==i+1||item.prevHash!==prev)return false;const copy={seq:item.seq,at:item.at,event:item.event,data:item.data,prevHash:item.prevHash};if(sha256(copy)!==item.hash)return false;prev=item.hash;}return true;}
module.exports={append,verify};
