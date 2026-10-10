async function runWithTimeout(fn, ms){let t;const timeout=new Promise((_,rej)=>t=setTimeout(()=>rej(Object.assign(new Error('TIMEOUT'),{code:'TIMEOUT'})),ms));try{return await Promise.race([Promise.resolve().then(fn),timeout])}finally{clearTimeout(t)}}
module.exports={runWithTimeout};
