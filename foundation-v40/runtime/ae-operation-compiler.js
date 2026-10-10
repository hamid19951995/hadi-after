const crypto=require('crypto');
function fingerprint(plan){return crypto.createHash('sha256').update(JSON.stringify(plan)).digest('hex');}
const MAP={
  'composition.create':'createProject','layer.text.create':'addTextLayer','layer.solid.create':'addSolidLayer',
  'shape.rectangle.create':'addRectangleShape','shape.ellipse.create':'addEllipseShape','layer.transform':'transformSelectedLayer',
  'layer.opacity.animate':'animateSelectedOpacity','render.queue':'queueComposition','project.save':'saveProject'
};
function compileOperation(op){
  if(!op||!op.action) throw new Error('OPERATION_ACTION_REQUIRED');
  const command=MAP[op.action]; if(!command) throw new Error('UNSUPPORTED_OPERATION:'+op.action);
  return {command,payload:op.parameters||{},operationId:op.operationId||null,expected:op.expected||null};
}
function compilePlan(plan){
  if(!plan||!Array.isArray(plan.operations)) throw new Error('PLAN_OPERATIONS_REQUIRED');
  const compiled=plan.operations.map(compileOperation);
  return {version:'v40',fingerprint:fingerprint({version:'v40',operations:compiled}),commands:compiled};
}
module.exports={compileOperation,compilePlan,fingerprint,MAP};
