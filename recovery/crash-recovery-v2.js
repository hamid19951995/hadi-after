"use strict";
class CrashRecoveryV2{
 constructor({journal,orchestrator}){this.journal=journal;this.orchestrator=orchestrator;}
 scan(){const report=this.journal.verify();const recoverable=[];for(const [id,state] of Object.entries(report.lastByOperation||{})){if(state==="RUNNING"||state==="RECOVERING")recoverable.push(id);}return {...report,recoverable};}
 async recoverAll(){const s=this.scan();const out=[];for(const id of s.recoverable){const x=await this.orchestrator.recover(id);if(x)out.push(x);}return out;}
}
module.exports={CrashRecoveryV2};
