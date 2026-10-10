const fs=require('fs'), path=require('path');
class AssetResolver { constructor({roots=[]}={}){this.roots=roots;} resolve(name){ for(const root of this.roots){ const p=path.resolve(root,name); if(fs.existsSync(p)) return {found:true,path:p}; } return {found:false,name}; } require(name){ const r=this.resolve(name); if(!r.found) throw new Error('Asset not resolved: '+name); return r.path; } }
module.exports={AssetResolver};
