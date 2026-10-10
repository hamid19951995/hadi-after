const crypto = require("crypto");
function hash(x) {
  return crypto.createHash("sha256").update(JSON.stringify(x)).digest("hex");
}
function normalizeProject(readback) {
  return {
    exists: !!readback.exists,
    file: readback.file || null,
    activeComp: readback.activeComp || null,
    numItems: readback.numItems || 0,
    comps: (readback.comps || []).map(c => ({
      name:c.name, width:c.width, height:c.height,
      duration:c.duration, frameRate:c.frameRate,
      numLayers:c.numLayers,
      layers:(c.layers || []).map(l => ({
        index:l.index,name:l.name,enabled:l.enabled,locked:l.locked,
        threeDLayer:l.threeDLayer,typeName:l.typeName
      }))
    }))
  };
}
function snapshot(readback, metadata={}) {
  const state = normalizeProject(readback);
  return {
    schema:"ae-boss-twin-v2",
    capturedAt:new Date().toISOString(),
    state,
    stateHash:hash(state),
    metadata
  };
}
function compare(expected, actual) {
  const e=normalizeProject(expected), a=normalizeProject(actual);
  return {match:hash(e)===hash(a), expectedHash:hash(e), actualHash:hash(a)};
}
module.exports={normalizeProject,snapshot,compare};
