/* AE BOSS OMEGA v28 - Advanced Rig Engine host implementation. */
function aeBossV28EnsureControl(layer,name,type){
  var effects=layer.property("ADBE Effect Parade");
  var e=effects.property(name);
  if(!e){ e=effects.addProperty(type==="position"?"ADBE Point Control":"ADBE Angle Control"); e.name=name; }
  return e;
}
function aeBossV28ApplyRig(comp,plan){
  if(!comp) throw new Error("NO_COMP"); if(!plan||plan.kind!=="advanced-rig-plan.v1") throw new Error("INVALID_ADVANCED_RIG_PLAN");
  var root=comp.layer("ROOT"); if(!root) { root=comp.layers.addNull(); root.name="ROOT"; }
  var ids=Object.keys(plan.controllers), controls={};
  for(var i=0;i<ids.length;i++){
    var id=ids[i], binding=null;
    for(var j=0;j<plan.bindings.length;j++) if(plan.bindings[j].controllerId===id){binding=plan.bindings[j];break;}
    var layer=comp.layer(binding?binding.layerName:"ROOT")||root;
    controls[id]=aeBossV28EnsureControl(layer,id,plan.controllers[id].type);
  }
  for(var k=0;k<plan.keyframes.length;k++){
    var f=plan.keyframes[k], c=controls[f.controller];
    if(c && c.property("ADBE Angle Control-0001")) c.property("ADBE Angle Control-0001").setValueAtTime(f.time,f.value);
    else if(c && c.property("ADBE Point Control-0001")) c.property("ADBE Point Control-0001").setValueAtTime(f.time,[f.value,f.value]);
  }
  return {ok:true,engine:"Advanced Rig Engine",engineVersion:plan.engineVersion,characterId:plan.characterId,keyframes:plan.keyframes.length};
}
