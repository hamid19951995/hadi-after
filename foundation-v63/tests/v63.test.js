const x=require('../runtime/support-bundle');const b=x.buildBundle({diagnostics:{token:'abc'}});if(!b.sha256||JSON.stringify(b).includes('abc'))throw Error('v63');console.log('v63 PASS');
