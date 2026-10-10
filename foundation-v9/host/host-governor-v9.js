"use strict";
const crypto=require("crypto");
const STATES=Object.freeze({OFFLINE:"OFFLINE",READY:"READY",BUSY:"BUSY",DEGRADED:"DEGRADED",UNKNOWN:"UNKNOWN"});
const sha256=v=>crypto.createHash("sha256").update(typeof v==="string"?v:JSON.stringify(v)).digest("hex");
class HostGovernorV9{
 constructor({clock=()=>Date.now(),leaseMs=30000}={}){this.clock=clock;this.leaseMs=leaseMs;this.state=STATES.OFFLINE;this.sessionId=null;this.lastHeartbeat=0;this.lease=null;}
 connect(meta={}){this.sessionId=crypto.randomUUID();this.state=STATES.READY;this.lastHeartbeat=this.clock();return {sessionId:this.sessionId,state:this.state,meta};}
 heartbeat(){if(!this.sessionId)return false;this.lastHeartbeat=this.clock();if(this.state===STATES.UNKNOWN)this.state=STATES.READY;return true;}
 acquireLease(operationId){if(!this.sessionId)throw Object.assign(new Error("HOST_OFFLINE"),{code:"HOST_OFFLINE"});const now=this.clock();if(this.lease&&this.lease.expiresAt>now&&this.lease.operationId!==operationId)throw Object.assign(new Error("HOST_LEASE_BUSY"),{code:"HOST_LEASE_BUSY"});this.lease={operationId,token:sha256(this.sessionId+":"+operationId+":"+now),expiresAt:now+this.leaseMs};this.state=STATES.BUSY;return this.lease;}
 validateLease(lease){if(!lease||!this.lease||lease.token!==this.lease.token||this.lease.expiresAt<=this.clock())throw Object.assign(new Error("HOST_LEASE_INVALID"),{code:"HOST_LEASE_INVALID"});return true;}
 releaseLease(lease){this.validateLease(lease);this.lease=null;this.state=STATES.READY;return true;}
 disconnect(){this.lease=null;this.sessionId=null;this.state=STATES.OFFLINE;}
 status(){return {state:this.state,sessionId:this.sessionId,lease:this.lease,lastHeartbeat:this.lastHeartbeat};}
}
module.exports={HostGovernorV9,STATES};
