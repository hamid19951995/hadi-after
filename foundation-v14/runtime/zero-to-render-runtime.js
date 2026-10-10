'use strict';
const {ProductionRuntime}=require('../../foundation-v13/runtime/production-runtime');
class ZeroToRenderRuntime extends ProductionRuntime {
 newProject(){return this.op({type:'project.new'});} saveProject(path){return this.op({type:'project.save',path});}
 createFolder(name,parent){return this.op({type:'folder.create',name,parent:parent||null});}
 addText(comp,name,text){return this.op({type:'layer.addText',comp,name,text});}
 addShape(comp,name,shape){return this.op({type:'layer.addShape',comp,name,shape});}
}
module.exports={ZeroToRenderRuntime};
