'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
function stable(v){ if(v===null||typeof v!=='object')return JSON.stringify(v); if(Array.isArray(v))return '['+v.map(stable).join(',')+']'; return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}'; }
function createCacheKey(namespace, payload){ return crypto.createHash('sha256').update(namespace+'|'+stable(payload)).digest('hex'); }
class CacheStore {
  constructor(root){ this.root=root; fs.mkdirSync(root,{recursive:true}); }
  file(key){ return path.join(this.root, key+'.json'); }
  get(key){ try { return JSON.parse(fs.readFileSync(this.file(key),'utf8')); } catch(e){ return null; } }
  set(key,value){ fs.writeFileSync(this.file(key), JSON.stringify({createdAt:new Date().toISOString(),value},null,2)); return value; }
  has(key){ return fs.existsSync(this.file(key)); }
  clear(){ for(const f of fs.readdirSync(this.root)){ if(f.endsWith('.json')) fs.unlinkSync(path.join(this.root,f)); } }
}
module.exports={createCacheKey,CacheStore};
