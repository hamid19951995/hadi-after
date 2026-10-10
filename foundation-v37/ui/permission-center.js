'use strict';
class PermissionCenter{
 constructor({permissions}={}){if(!permissions)throw new Error('permissions required');this.permissions=permissions;}
 status(scopes=[]){const grants=new Map(this.permissions.list().map(g=>[g.scope,g]));return scopes.map(scope=>{const g=grants.get(String(scope).toLowerCase());return {scope:String(scope).toLowerCase(),status:g?'granted':'denied',level:g?g.level:'none',grant:g||null};});}
 grant(scope,level,meta={}){return this.permissions.grant(scope,level,{...meta,interactive:true});}
 revoke(scope){return this.permissions.revoke(scope);}
 audit(){return this.permissions.auditLog();}
}
module.exports={PermissionCenter};
