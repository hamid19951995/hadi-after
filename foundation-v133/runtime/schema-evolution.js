'use strict';
function migrate(snapshot,targetVersion){const x=JSON.parse(JSON.stringify(snapshot||{}));let v=Number(x.schemaVersion||1);while(v<targetVersion){if(v===1){x.metadata=x.metadata||{};x.schemaVersion=2;v=2;}else if(v===2){x.capabilities=Array.isArray(x.capabilities)?x.capabilities:[];x.schemaVersion=3;v=3;}else throw new Error('unsupported schema '+v);}return x;}
function compatible(snapshot){try{return migrate(snapshot,3).schemaVersion===3;}catch(e){return false;}}
module.exports={migrate,compatible};
