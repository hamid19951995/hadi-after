const assert=require('assert');const {build}=require('../runtime/coverage-matrix');const r=build(['a','b'],['a']);assert.equal(r.covered,1);assert.equal(r.complete,false);console.log('v128 PASS');
