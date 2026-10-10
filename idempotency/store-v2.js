"use strict";
class IdempotencyStoreV2{
 constructor(){this.map=new Map();}
 get(key){return key?this.map.get(key)||null:null;}
 set(key,value){if(key)this.map.set(key,value);return value;}
 has(key){return !!this.get(key);}
 clear(key){return this.map.delete(key);}
 size(){return this.map.size;}
}
module.exports={IdempotencyStoreV2};
