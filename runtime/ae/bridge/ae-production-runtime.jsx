/* AE BOSS Omega v12 Production Runtime - execute inside After Effects */
(function () {
  function fail(m){ throw new Error(m); }
  function project(){ if(!app.project) app.newProject(); return app.project; }
  function findComp(name){ var p=project(); for(var i=1;i<=p.numItems;i++) if(p.item(i) instanceof CompItem && p.item(i).name===name) return p.item(i); return null; }
  function snapshot(path){ var p=project(); var f=new File(path); p.save(f); return {path:f.fsName, ok:true}; }
  function restore(path){ var f=new File(path); if(!f.exists) fail('Snapshot not found: '+path); app.open(f); return {path:f.fsName, ok:true}; }
  function resolveAsset(path){ var f=new File(path); if(!f.exists) return {found:false,path:path}; return {found:true,path:f.fsName}; }
  function apply(op){ var p=project(), c, l, prop, item;
    if(op.type==='project.snapshot') return snapshot(op.path);
    if(op.type==='project.restore') return restore(op.path);
    if(op.type==='comp.create'){ c=p.items.addComp(op.name,op.width||1920,op.height||1080,op.pixelAspect||1,op.duration||10,op.frameRate||30); return {compId:c.id,name:c.name}; }
    if(op.type==='layer.addSolid'){ c=findComp(op.comp); if(!c) fail('Composition not found'); l=c.layers.addSolid(op.color||[1,1,1],op.name||'Solid',c.width,c.height,1,c.duration); return {layerIndex:l.index,name:l.name}; }
    if(op.type==='layer.importAsset'){ c=findComp(op.comp); var r=resolveAsset(op.path); if(!r.found) fail('Asset missing'); item=p.importFile(new ImportOptions(new File(r.path))); l=c.layers.add(item); return {layerIndex:l.index,asset:r.path}; }
    if(op.type==='property.set'){ c=findComp(op.comp); if(!c) fail('Composition not found'); l=c.layer(op.layer); if(!l) fail('Layer not found'); prop=l.property(op.property); if(!prop) fail('Property not found'); prop.setValue(op.value); return {ok:true}; }
    if(op.type==='render.enqueue'){ c=findComp(op.comp); if(!c) fail('Composition not found'); var rq=p.renderQueue.items.add(c); if(op.output) rq.outputModule(1).file=new File(op.output); return {queueIndex:rq.index}; }
    if(op.type==='render.run'){ p.renderQueue.render(); return {ok:true}; }
    fail('Unknown operation '+op.type);
  }
  $.global.AEBossProductionRuntime={apply:apply,snapshot:snapshot,restore:restore,resolveAsset:resolveAsset};
}());
