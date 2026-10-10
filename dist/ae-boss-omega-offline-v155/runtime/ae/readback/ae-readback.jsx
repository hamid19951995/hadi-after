/* AE BOSS Ω — deterministic readback adapter.
   Read-only by design. No eval. No external process access. */
(function () {
  function propInfo(p) {
    var o = {name:p.name, matchName:p.matchName, propertyType:String(p.propertyType)};
    try { o.numKeys = p.numKeys; } catch(e) {}
    try { o.value = p.value; } catch(e) {}
    return o;
  }

  function layerInfo(layer) {
    var o = {
      index: layer.index,
      name: layer.name,
      enabled: layer.enabled,
      locked: layer.locked,
      shy: layer.shy,
      solo: layer.solo,
      threeDLayer: layer.threeDLayer,
      typeName: String(layer.matchName || "")
    };
    try { o.inPoint = layer.inPoint; o.outPoint = layer.outPoint; } catch(e) {}
    return o;
  }

  function compInfo(comp) {
    var layers = [];
    for (var i=1; i<=comp.numLayers; i++) layers.push(layerInfo(comp.layer(i)));
    return {
      name: comp.name,
      width: comp.width,
      height: comp.height,
      duration: comp.duration,
      frameRate: comp.frameRate,
      numLayers: comp.numLayers,
      layers: layers
    };
  }

  function projectInfo() {
    if (!app.project) return {exists:false};
    var comps = [];
    for (var i=1; i<=app.project.numItems; i++) {
      var item = app.project.item(i);
      if (item instanceof CompItem) comps.push(compInfo(item));
    }
    return {
      exists:true,
      file: app.project.file ? app.project.file.fsName : null,
      numItems: app.project.numItems,
      activeComp: app.project.activeItem && app.project.activeItem instanceof CompItem
        ? app.project.activeItem.name : null,
      comps: comps
    };
  }

  $.global.AEBOSS_Readback = {
    project: projectInfo
  };
}());
