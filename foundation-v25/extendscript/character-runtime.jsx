/* AE BOSS OMEGA v25: original generated 2D character runtime. Does not copy third-party rigs or assets. */
function aeBossV25CharacterFindComp(name){for(var i=1;i<=app.project.numItems;i++){var it=app.project.item(i);if(it instanceof CompItem&&it.name===name)return it;}return null;}
function aeBossV25AddPiece(comp,name,w,h,color,pos,parent){var l=comp.layers.addSolid(color,name,w,h,1,comp.duration);l.property("ADBE Transform Group").property("ADBE Position").setValue(pos);if(parent)l.parent=parent;return l;}
function aeBossV25CreateCharacter(op){
 app.beginUndoGroup("AE BOSS v25 Create Original Character");try{
  var c=aeBossV25CharacterFindComp(op.comp);if(!c)c=app.project.items.addComp(op.comp||"AE_BOSS_CHARACTER_SCENE",op.width||1920,op.height||1080,1,op.duration||8,op.frameRate||30);
  var x=(op.x===undefined?c.width/2:op.x), y=(op.y===undefined?c.height*0.72:op.y);
  var root=c.layers.addNull(); root.name="AE_BOSS_CHAR_ROOT"; root.property("ADBE Transform Group").property("ADBE Position").setValue([x,y]);
  var body=aeBossV25AddPiece(c,"AE_BOSS_CHAR_BODY",220,330,[0.2,0.45,0.8],[0,-180],root);
  var head=aeBossV25AddPiece(c,"AE_BOSS_CHAR_HEAD",180,180,[0.95,0.75,0.55],[0,-440],root);
  var la=aeBossV25AddPiece(c,"AE_BOSS_CHAR_LEFT_ARM",60,240,[0.15,0.35,0.65],[-150,-170],root);
  var ra=aeBossV25AddPiece(c,"AE_BOSS_CHAR_RIGHT_ARM",60,240,[0.15,0.35,0.65],[150,-170],root);
  var ll=aeBossV25AddPiece(c,"AE_BOSS_CHAR_LEFT_LEG",70,280,[0.12,0.2,0.35],[-65,130],root);
  var rl=aeBossV25AddPiece(c,"AE_BOSS_CHAR_RIGHT_LEG",70,280,[0.12,0.2,0.35],[65,130],root);
  return {ok:true,comp:c.name,root:root.name,pieces:[body.name,head.name,la.name,ra.name,ll.name,rl.name]};
 }catch(e){return {ok:false,error:String(e)};}finally{app.endUndoGroup();}
}
function aeBossV25Layer(comp,name){for(var i=1;i<=comp.numLayers;i++)if(comp.layer(i).name===name)return comp.layer(i);return null;}
function aeBossV25Rot(layer,time,duration,a,b){if(!layer)return;var p=layer.property("ADBE Transform Group").property("ADBE Rotate Z");p.setValueAtTime(time,a);p.setValueAtTime(time+duration/2,b);p.setValueAtTime(time+duration,a);}
function aeBossV25Action(op){app.beginUndoGroup("AE BOSS v25 Character Action");try{var c=aeBossV25FindComp(op.comp)||app.project.activeItem;if(!(c instanceof CompItem))return {ok:false,error:"COMP_NOT_FOUND"};var t=Number(op.start)||0,d=Number(op.duration)||1,a=String(op.action||"idle");var root=aeBossV25Layer(c,"AE_BOSS_CHAR_ROOT"),la=aeBossV25Layer(c,"AE_BOSS_CHAR_LEFT_ARM"),ra=aeBossV25Layer(c,"AE_BOSS_CHAR_RIGHT_ARM"),ll=aeBossV25Layer(c,"AE_BOSS_CHAR_LEFT_LEG"),rl=aeBossV25Layer(c,"AE_BOSS_CHAR_RIGHT_LEG"),head=aeBossV25Layer(c,"AE_BOSS_CHAR_HEAD");
 if(a==="walk"){aeBossV25Rot(ll,t,d,-25,25);aeBossV25Rot(rl,t,d,25,-25);aeBossV25Rot(la,t,d,20,-20);aeBossV25Rot(ra,t,d,-20,20);} else if(a==="wave"){aeBossV25Rot(ra,t,d,0,-55);aeBossV25Rot(ra,t+d/2,d/2,-55,-20);} else if(a==="point"){aeBossV25Rot(ra,t,d,0,-80);} else if(a==="think"){aeBossV25Rot(head,t,d,0,12);aeBossV25Rot(ra,t,d,0,-65);} else if(a==="celebrate"){aeBossV25Rot(la,t,d,0,-130);aeBossV25Rot(ra,t,d,0,130);} else if(a==="present"||a==="talk"){aeBossV25Rot(la,t,d,0,-35);aeBossV25Rot(ra,t,d,0,35);} else if(a==="enter"||a==="exit"){var p=root.property("ADBE Transform Group").property("ADBE Position"),start=a==="enter"?[-300,c.height*.72]:[c.width/2,c.height*.72],end=a==="enter"?[c.width/2,c.height*.72]:[c.width+300,c.height*.72];p.setValueAtTime(t,start);p.setValueAtTime(t+d,end);} else {aeBossV25Rot(head,t,d,0,5);}
 return {ok:true,action:a,start:t,duration:d};}catch(e){return {ok:false,error:String(e)};}finally{app.endUndoGroup();}}
function aeBossV25FindComp(name){return aeBossV25CharacterFindComp(name);}
