'use strict';
const {TransactionalJournalV21}=require('../../foundation-v21/journal/transactional-journal');
class ReconciledJournalV22 extends TransactionalJournalV21{
 state(jobId){
  const s=super.state(jobId); s.prepared=[]; s.committed=[]; s.specHash=null;
  for(const r of this.read(jobId)){const e=r.event||{};
   if(e.type==='JOB_INTENT'||e.type==='JOB_RESUME') s.specHash=e.specHash||s.specHash;
   if(e.type==='STEP_PREPARE'&&!s.prepared.includes(e.step)) s.prepared.push(e.step);
   if(e.type==='STEP_COMMIT'&&!s.committed.includes(e.step)) s.committed.push(e.step);
  }
  s.uncertain=s.prepared.filter(x=>!s.committed.includes(x));
  return s;
 }
}
module.exports={ReconciledJournalV22};
