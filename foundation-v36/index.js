'use strict';
const v35=require('../foundation-v35');
const {PermissionManager,LEVELS}=require('./permissions/permission-manager');
const {WindowsTerminal}=require('./terminal/windows-terminal');
const {AutomationOrchestrator}=require('./runtime/automation-orchestrator');
module.exports={...v35,version:'36.0.0',PermissionManager,WindowsTerminal,AutomationOrchestrator,permissionLevels:LEVELS};
