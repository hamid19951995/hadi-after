const assert=require('assert');const {diff}=require('../runtime/dry-run-diff');assert(!diff({a:1},{a:2}).equal);assert(diff({a:1},{a:1}).equal);console.log('v107 PASS');
