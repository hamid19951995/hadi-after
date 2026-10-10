'use strict';
const v33=require('../foundation-v33'); const {runBatch}=require('./scheduler/batch-scheduler'); const {resume}=require('./recovery/resume-engine'); const {buildReport}=require('./reporting/execution-report');
module.exports={...v33,version:'34.0.0',runProductionBatch:runBatch,resumeProductionJob:resume,buildExecutionReport:buildReport};
