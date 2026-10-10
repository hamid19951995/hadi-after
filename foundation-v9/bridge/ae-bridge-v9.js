"use strict";
const net=require("net");
class AEBridgeV9{
 constructor({host="127.0.0.1",port=0,requestTimeoutMs=15000,governor}={}){this.host=host;this.port=port;this.requestTimeoutMs=requestTimeoutMs;this.governor=governor;this.server=null;this.connections=new Set();this.handlers=new Map();this.pending=new Map();this.seq=0;}
 register(action,handler){if(!action||typeof handler!=="function")throw new TypeError("invalid bridge handler");this.handlers.set(action,handler);}
 start(){return new Promise((resolve,reject)=>{this.server=net.createServer(s=>this._connection(s));this.server.once("error",reject);this.server.listen(this.port,this.host,()=>{this.port=this.server.address().port;resolve({host:this.host,port:this.port});});});}
 _connection(socket){this.connections.add(socket);let buffer="";socket.setEncoding("utf8");socket.on("data",chunk=>{buffer+=chunk;let i;while((i=buffer.indexOf("\n"))>=0){const line=buffer.slice(0,i);buffer=buffer.slice(i+1);if(line.trim())this._request(socket,line.trim());}});socket.on("close",()=>this.connections.delete(socket));}
 async _request(socket,line){let req;try{req=JSON.parse(line);}catch(_){return this._reply(socket,{ok:false,error:{code:"INVALID_JSON"}});}const id=req.requestId||String(++this.seq);try{if(req.type==="PING"){this._reply(socket,{requestId:id,ok:true,type:"PONG",protocol:"AE-BOSS-OMEGA/9"});return;}if(req.type!=="EXECUTE")throw Object.assign(new Error("UNSUPPORTED_REQUEST"),{code:"UNSUPPORTED_REQUEST"});if(this.governor)this.governor.heartbeat();const h=this.handlers.get(req.action);if(!h)throw Object.assign(new Error("ACTION_NOT_REGISTERED"),{code:"ACTION_NOT_REGISTERED"});const result=await Promise.race([Promise.resolve(h(req)),new Promise((_,r)=>setTimeout(()=>r(Object.assign(new Error("BRIDGE_TIMEOUT"),{code:"BRIDGE_TIMEOUT"})),this.requestTimeoutMs))]);this._reply(socket,{requestId:id,ok:true,result});}catch(e){this._reply(socket,{requestId:id,ok:false,error:{code:e.code||"BRIDGE_ERROR",message:e.message||String(e)}});}}
 _reply(socket,payload){try{socket.write(JSON.stringify(payload)+"\n");}catch(_) {}}
 stop(){for(const s of this.connections)s.destroy();this.connections.clear();return new Promise(resolve=>{if(!this.server)return resolve();this.server.close(()=>resolve());});}
}
module.exports={AEBridgeV9};
