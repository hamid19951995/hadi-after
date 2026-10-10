/* Live-host adapter boundary. Run only inside Adobe After Effects.
   Commands must be received from the approved local bridge and read back from AE DOM. */
function aeBossReadback(operation){
  var result={operationId:operation.operationId,verified:false};
  if(!app.project){ result.reason='NO_PROJECT'; return result; }
  if(operation.action==='composition.create'){
    for(var i=1;i<=app.project.numItems;i++) if(app.project.item(i).name===operation.parameters.name){result.verified=true;break;}
  }
  return result;
}
