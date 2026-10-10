/* AE BOSS OMEGA v26 — read-only project inspector. Run inside Adobe After Effects. */
function aeBossV26LayerType(layer){
 try{if(layer instanceof AVLayer)return "AVLayer";if(layer instanceof ShapeLayer)return "ShapeLayer";if(layer instanceof TextLayer)return "TextLayer";if(layer instanceof CameraLayer)return "CameraLayer";if(layer instanceof LightLayer)return "LightLayer";if(layer instanceof NullLayer)return "NullLayer";}catch(e){} return "Layer";
}
function aeBossV26InspectProject(){
 var p=app.project,items=[];
 for(var i=1;i<=p.numItems;i++){
  var it=p.item(i);
  if(it instanceof CompItem){var layers=[];for(var j=1;j<=it.numLayers;j++){var l=it.layer(j),controls=[];try{var eg=l.property("ADBE Effect Parade");for(var k=1;k<=eg.numProperties;k++)controls.push(eg.property(k).name);}catch(e){} layers.push({index:j,name:l.name,type:aeBossV26LayerType(l),parent:l.parent?l.parent.name:"",enabled:l.enabled,hasExpressions:!!(l.property("ADBE Transform Group")&&l.property("ADBE Transform Group").property("ADBE Position").expressionEnabled),controls:controls});}
   items.push({id:it.id,name:it.name,type:"CompItem",width:it.width,height:it.height,duration:it.duration,frameRate:it.frameRate,layers:layers});
  }else items.push({id:it.id,name:it.name,type:(it instanceof FootageItem?"FootageItem":"Item")});
 }
 return {projectName:p.file?p.file.name:"Untitled",items:items};
}
