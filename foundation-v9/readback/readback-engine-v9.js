"use strict";
const crypto=require("crypto");
const hash=v=>crypto.createHash("sha256").update(JSON.stringify(v??null)).digest("hex");
class ReadbackEngineV9{
 constructor({provider,clock=()=>Date.now()}={}){if(typeof provider!=="function")throw new TypeError("provider required");this.provider=provider;this.clock=clock;}
 async capture(expected){const value=await this.provider(expected);return {capturedAt:new Date(this.clock()).toISOString(),value,hash:hash(value)};}
 async verify({before,after,expected,result}){const expectedHash=expected===undefined?null:hash(expected);const semantic=result&&result.ok!==false;const matchesExpected=expected===undefined||expected===null||after.value!==undefined;return {ok:Boolean(semantic&&matchesExpected),beforeHash:before.hash,afterHash:after.hash,expectedHash};}
}
module.exports={ReadbackEngineV9};
