'use strict'; class JobCheckpoint {constructor(){this.state=new Map();}save(id,data){this.state.set(id,{...data,updatedAt:new Date().toISOString()});return this.load(id);}load(id){return this.state.get(id)||null;}clear(id){this.state.delete(id);}}
module.exports={JobCheckpoint};
