'use strict';
const crypto=require('crypto');
function hash(value){return crypto.createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');}
class ContentAddressedStore{constructor(){this.map=new Map();}put(value){const digest=hash(value);if(!this.map.has(digest))this.map.set(digest,value);return digest;}get(digest){return this.map.get(digest);}has(digest){return this.map.has(digest);}size(){return this.map.size;}}
module.exports={ContentAddressedStore,hash};
