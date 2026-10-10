'use strict';
const crypto=require('crypto');
const LEVELS=['none','read','write','execute','admin'];
const ORDER=Object.fromEntries(LEVELS.map((x,i)=>[x,i]));
function normalizeScope(s){return String(s||'').trim().toLowerCase();}
function now(){return new Date().toISOString();}
class PermissionManager{
  constructor({policy={}}={}){this.policy={defaultLevel:'none',...policy};this.grants=new Map();this.audit=[];}
  grant(scope,level,meta={}){scope=normalizeScope(scope);if(!ORDER.hasOwnProperty(level))throw new Error('Invalid permission level');
    const grant={scope,level,grantedAt:now(),expiresAt:meta.expiresAt||null,reason:meta.reason||'',interactive:meta.interactive!==false,token:crypto.createHash('sha256').update(scope+'|'+level+'|'+Date.now()+'|'+Math.random()).digest('hex')};
    this.grants.set(scope,grant);this._audit('grant',grant);return {...grant};}
  revoke(scope){scope=normalizeScope(scope);const prior=this.grants.get(scope);this.grants.delete(scope);this._audit('revoke',{scope,prior:prior?prior.level:null});return !!prior;}
  check(scope,required='read'){
    scope=normalizeScope(scope);const g=this.grants.get(scope);const level=g?g.level:this.policy.defaultLevel;
    const expired=g&&g.expiresAt&&Date.parse(g.expiresAt)<=Date.now();
    const allowed=!expired && ORDER[level]>=ORDER[required];
    this._audit('check',{scope,required,level,allowed,expired:!!expired});return {allowed,scope,required,level,expired:!!expired};}
  list(){return [...this.grants.values()].map(x=>({...x}));}
  _audit(type,data){this.audit.push({at:now(),type,data});}
  auditLog(){return this.audit.map(x=>({...x}));}
}
module.exports={PermissionManager,LEVELS};
