"use strict";
const fs=require("fs"),os=require("os"),path=require("path");
const {AuditLedgerV10,CapabilityGuardV10}=require("../");
function certify(){
 const d=fs.mkdtempSync(path.join(os.tmpdir(),"aeboss-cert-v10-"));
 try{
  const a=new AuditLedgerV10({file:path.join(d,"audit.ndjson")});
  a.append("CERTIFICATION_START",{version:10});
  a.append("CERTIFICATION_END",{version:10});
  const g=new CapabilityGuardV10({capabilities:{"host.execute":{enabled:true}}});
  const result={audit:a.verify().ok?"PASS":"FAIL",capability:g.authorize("host.execute").ok?"PASS":"FAIL"};
  result.overall=Object.values(result).every(v=>v==="PASS")?"PASS":"FAIL";
  return result;
 } finally { fs.rmSync(d,{recursive:true,force:true}); }
}
if(require.main===module){console.log(JSON.stringify(certify(),null,2));process.exit(certify().overall==="PASS"?0:1)}
module.exports={certify};
