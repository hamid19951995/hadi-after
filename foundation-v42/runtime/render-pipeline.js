const fs=require('fs'); const path=require('path');
const STATES=['CREATED','VALIDATED','QUEUED','RENDERING','VERIFYING','COMPLETED','FAILED','CANCELLED'];
function validate(job){if(!job||!job.outputPath) throw new Error('OUTPUT_PATH_REQUIRED');const dir=path.dirname(job.outputPath);if(!fs.existsSync(dir)) throw new Error('OUTPUT_DIRECTORY_MISSING');return {...job,state:'VALIDATED'};}
function verifyOutput(file,{minBytes=1}={}){if(!fs.existsSync(file))return {ok:false,reason:'OUTPUT_MISSING'};const s=fs.statSync(file);return s.size>=minBytes?{ok:true,size:s.size}:{ok:false,reason:'OUTPUT_TOO_SMALL',size:s.size};}
class RenderQueue{constructor(){this.jobs=[];} enqueue(job){const j=validate(job);j.id=job.id||`render-${this.jobs.length+1}`;j.state='QUEUED';this.jobs.push(j);return j;} next(){return this.jobs.find(j=>j.state==='QUEUED')||null;}}
module.exports={STATES,validate,verifyOutput,RenderQueue};