'use strict';
const v32=require('../foundation-v32'); const {execute}=require('./execution/local-executor'); const {createQueue}=require('./queue/job-queue'); const {createJob,transition}=require('./runtime/job-lifecycle'); const {createJournal}=require('./journal/execution-journal');
module.exports={...v32,version:'33.0.0',executeProductionPlan:execute,createExecutionQueue:createQueue,createExecutionJob:createJob,transitionExecutionJob:transition,createExecutionJournal:createJournal};
