'use strict';const fs=require('fs');const path=require('path');
const NAMES=['workspace','temp','renders','exports','checkpoints','cache','audit'];
class WorkspaceManager{constructor({root}={}){this.root=path.resolve(root||process.cwd());}init(){for(const n of NAMES)fs.mkdirSync(path.join(this.root,n),{recursive:true});return this.describe();}resolve(name,...parts){if(!NAMES.includes(name))throw new Error('Unknown workspace');const base=path.resolve(this.root,name);const target=path.resolve(base,...parts);if(target!==base&&!target.startsWith(base+path.sep))throw new Error('Workspace escape blocked');return target;}describe(){return Object.fromEntries(NAMES.map(n=>[n,this.resolve(n)]));}}
module.exports={WorkspaceManager,NAMES};
