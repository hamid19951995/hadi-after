const assert=require('assert');const x=require('../runtime/reproducibility-bundle');const b=x.create({b:2,a:1});assert(x.verify(b));b.canonical.a=9;assert(!x.verify(b));console.log('v129 PASS');
