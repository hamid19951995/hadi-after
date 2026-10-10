"use strict";
class RecoveryCoordinatorV10{
 constructor({snapshotManager,audit}={}){if(!snapshotManager||!audit)throw new TypeError("snapshotManager and audit required");this.snapshotManager=snapshotManager;this.audit=audit;}
 async recover(operation){if(!operation||!operation.snapshotId)return {status:"MANUAL_REQUIRED",reason:"NO_SNAPSHOT"};try{const r=await this.snapshotManager.restore(operation.snapshotId);this.audit.append("RECOVERY_RESTORE",{operationId:operation.operationId,snapshotId:operation.snapshotId});return {status:r.ok?"RESTORED":"FAILED",...r};}catch(e){this.audit.append("RECOVERY_FAILED",{operationId:operation.operationId,error:e.message});return {status:"FAILED",error:{code:e.code||"RECOVERY_FAILED",message:e.message}};}}
}
module.exports={RecoveryCoordinatorV10};
