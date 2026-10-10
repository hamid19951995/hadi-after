const assert=require('assert');const {canonical,hash}=require('../runtime/deep-canonical');
const a={z:{b:2,a:1},x:[{d:4,c:3}]},b={x:[{c:3,d:4}],z:{a:1,b:2}};
assert.equal(canonical(a),canonical(b));assert.equal(hash(a),hash(b));console.log('v116 PASS');
