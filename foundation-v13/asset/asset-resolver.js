'use strict'; const fs=require('fs'); const path=require('path');
class AssetResolver {constructor({roots=[]}={}){this.roots=roots;}
 async resolve(input){if(!input)throw new Error('asset path required');if(fs.existsSync(input))return path.resolve(input);for(const root of this.roots){const candidate=path.resolve(root,input);if(fs.existsSync(candidate))return candidate;}throw new Error(`Asset not found: ${input}`);}}
module.exports={AssetResolver};
