const assert=require('assert');const {compare}=require('../runtime/golden-transcript');assert(compare([{a:1}],[{a:1}]).match);assert(!compare([{a:1}],[{a:2}]).match);console.log('v113 PASS');
