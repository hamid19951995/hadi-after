/* AE BOSS OMEGA v40 Production Runtime. Load after jsx/host.jsx inside After Effects. */
function aeBossV40Readback(payload){
  var comp=app.project&&app.project.activeItem;
  if(!(comp instanceof CompItem)) return {ok:false,message:'NO_ACTIVE_COMPOSITION'};
  return {ok:true,composition:{name:comp.name,width:comp.width,height:comp.height,duration:comp.duration,frameRate:comp.frameRate,layers:comp.numLayers,time:comp.time}};
}
