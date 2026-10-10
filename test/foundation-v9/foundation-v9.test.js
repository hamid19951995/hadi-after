"use strict";
const assert=require("assert");const {HostGovernorV9,AEBridgeV9,ReadbackEngineV9,WatchdogV9}=require("../../foundation-v9");
(async()=>{
 const g=new HostGovernorV9();assert.equal(g.status().state,"OFFLINE");const s=g.connect({host:"test"});assert(s.sessionId);assert(g.heartbeat());
 const b=new AEBridgeV9({governor:g});b.register("ping",async req=>({ok:true,echo:req.parameters}));const addr=await b.start();
 const net=require("net");const response=await new Promise((resolve,reject)=>{const c=net.createConnection(addr.port,addr.host,()=>c.write(JSON.stringify({requestId:"1",type:"EXECUTE",action:"ping",parameters:{x:1}})+"\n"));c.setEncoding("utf8");c.on("data",d=>{try{resolve(JSON.parse(d));c.destroy();}catch(_){}});c.on("error",reject);});assert.equal(response.ok,true);assert.equal(response.result.echo.x,1);await b.stop();
 let value={comp:"Main",layers:2};const r=new ReadbackEngineV9({provider:async()=>value});const before=await r.capture();value={comp:"Main",layers:3};const after=await r.capture();const v=await r.verify({before,after,expected:{},result:{ok:true}});assert(v.ok);
 const wd=new WatchdogV9({governor:g,maxSilenceMs:1000});assert(wd.check().ok);wd.stop();
 console.log("AE BOSS Omega Foundation v9 tests passed");
})().catch(e=>{console.error(e);process.exit(1)});
