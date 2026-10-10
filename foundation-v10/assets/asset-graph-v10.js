"use strict";
class AssetGraphV10{
 constructor(){this.nodes=new Map();this.edges=new Map();}
 add(node){if(!node||!node.id)throw new Error("INVALID_ASSET");this.nodes.set(node.id,{...node});if(!this.edges.has(node.id))this.edges.set(node.id,new Set());return this.nodes.get(node.id);}
 link(from,to,type="DEPENDS_ON"){if(!this.nodes.has(from)||!this.nodes.has(to))throw new Error("ASSET_NOT_FOUND");this.edges.get(from).add(JSON.stringify({to,type}));}
 dependencies(id){if(!this.nodes.has(id))throw new Error("ASSET_NOT_FOUND");return [...this.edges.get(id)].map(x=>JSON.parse(x));}
 validate(){const errors=[];for(const [id,edges] of this.edges)for(const raw of edges){const e=JSON.parse(raw);if(!this.nodes.has(e.to))errors.push({id,to:e.to,code:"BROKEN_EDGE"});}return {ok:errors.length===0,errors};}
}
module.exports={AssetGraphV10};
