const crypto=require('crypto');
function compact(entries){const latest=new Map(); for(const e of entries||[]) latest.set(e.key,e.value); const state=Object.fromEntries([...latest].sort(([a],[b])=>a.localeCompare(b))); const hash=crypto.createHash('sha256').update(JSON.stringify(state)).digest('hex'); return {state,hash,count:Object.keys(state).length};}
module.exports={compact};
