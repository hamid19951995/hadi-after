const fs=require('fs'); const path=require('path'); const cp=require('child_process');
function commandExists(cmd){try{const r=cp.spawnSync(cmd,['--version'],{encoding:'utf8'});return r.status===0;}catch(e){return false;}}
function diagnose(env={}){const checks=[{name:'node',ok:commandExists('node')},{name:'python',ok:commandExists('python')},{name:'projectRoot',ok:!!env.projectRoot&&fs.existsSync(env.projectRoot)},{name:'cepManifest',ok:!env.cepManifest||fs.existsSync(env.cepManifest)}];return {ok:checks.every(c=>c.ok||c.name==='cepManifest'),checks};}
module.exports={diagnose,commandExists};