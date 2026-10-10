const DEFAULT={
  'composition.create':{risk:'LOW',permissions:['aftereffects.runtime']},
  'layer.create':{risk:'LOW',permissions:['aftereffects.runtime']},
  'asset.import':{risk:'MEDIUM',permissions:['aftereffects.runtime','filesystem.workspace']},
  'project.save':{risk:'MEDIUM',permissions:['aftereffects.runtime','filesystem.workspace']},
  'render.start':{risk:'MEDIUM',permissions:['aftereffects.runtime','filesystem.workspace']},
  'layer.delete':{risk:'HIGH',permissions:['aftereffects.runtime'],confirmation:true},
  'project.close':{risk:'HIGH',permissions:['aftereffects.runtime'],confirmation:true}
};
function assess(op, granted=[]){const spec=DEFAULT[op.type]||{risk:'UNKNOWN',permissions:[]};const missing=spec.permissions.filter(p=>!granted.includes(p));return {allowed:missing.length===0,missing,risk:spec.risk,confirmation:!!spec.confirmation,capability:op.type};}
function matrix(){return JSON.parse(JSON.stringify(DEFAULT));}
module.exports={assess,matrix,DEFAULT};
