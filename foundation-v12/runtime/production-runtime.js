class ProductionRuntime {
 constructor({transport, watchdog}){ this.transport=transport; this.watchdog=watchdog; }
 async op(operation){ this.watchdog && this.watchdog.beat(); return this.transport.execute(operation); }
 snapshot(path){ return this.op({type:'project.snapshot',path}); }
 restore(path){ return this.op({type:'project.restore',path}); }
 createComp(name,width=1920,height=1080,duration=10,frameRate=30){ return this.op({type:'comp.create',name,width,height,duration,frameRate}); }
 addSolid(comp,name,color){ return this.op({type:'layer.addSolid',comp,name,color}); }
 importAsset(comp,path){ return this.op({type:'layer.importAsset',comp,path}); }
 setProperty(comp,layer,property,value){ return this.op({type:'property.set',comp,layer,property,value}); }
 enqueueRender(comp,output){ return this.op({type:'render.enqueue',comp,output}); }
 render(){ return this.op({type:'render.run'}); }
}
module.exports={ProductionRuntime};
