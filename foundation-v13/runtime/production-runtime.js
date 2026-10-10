'use strict';
const crypto=require('crypto');
class ProductionRuntime {
 constructor({transport,watchdog,assetResolver=null,audit=null}={}){if(!transport||typeof transport.execute!=='function')throw new Error('transport.execute required');this.transport=transport;this.watchdog=watchdog;this.assetResolver=assetResolver;this.audit=audit;this.seq=0;}
 async op(operation){const id=operation.id||`op-${Date.now()}-${++this.seq}`;const envelope={...operation,id,ts:new Date().toISOString()};this.watchdog&&this.watchdog.beat();this.audit&&this.audit({phase:'START',operation:envelope});try{const result=await this.transport.execute(envelope);if(!result||result.ok===false)throw new Error(result&&result.error||'AE operation failed');this.audit&&this.audit({phase:'DONE',operation:envelope,result});return result;}catch(error){this.audit&&this.audit({phase:'FAILED',operation:envelope,error:String(error.message||error)});throw error;}}
 snapshot(path){return this.op({type:'project.snapshot',path});} restore(path){return this.op({type:'project.restore',path});}
 createComp(name,width=1920,height=1080,duration=10,frameRate=30){return this.op({type:'comp.create',name,width,height,duration,frameRate});}
 addSolid(comp,name,color){return this.op({type:'layer.addSolid',comp,name,color});}
 async importAsset(comp,path){const resolved=this.assetResolver?await this.assetResolver.resolve(path):path;return this.op({type:'layer.importAsset',comp,path:resolved});}
 setProperty(comp,layer,property,value){return this.op({type:'property.set',comp,layer,property,value});}
 keyframe(comp,layer,property,time,value){return this.op({type:'property.keyframe',comp,layer,property,time,value});}
 enqueueRender(comp,output){return this.op({type:'render.enqueue',comp,output});} render(){return this.op({type:'render.run'});}
 fingerprint(spec){return crypto.createHash('sha256').update(JSON.stringify(spec)).digest('hex');}
}
module.exports={ProductionRuntime};
