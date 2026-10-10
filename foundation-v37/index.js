'use strict';
const v36=require('../foundation-v36');
const {PermissionCenter}=require('./ui/permission-center');
const {ControlledConsole,EmergencyStop}=require('./runtime/controlled-console');
module.exports={...v36,version:'37.0.0',PermissionCenter,ControlledConsole,EmergencyStop};
