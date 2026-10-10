"use strict";
class AEHostAdapterV9{
 constructor({bridge,governor}={}){if(!bridge||!governor)throw new TypeError("bridge and governor required");this.bridge=bridge;this.governor=governor;this.handlers=new Map();}
 registerCommand(command,handler){this.handlers.set(command,handler);this.bridge.register(command,async req=>{this.governor.heartbeat();return handler(req.parameters||{},req);});}
 registerDefaultCommands(commands){for(const [name,fn] of Object.entries(commands||{}))this.registerCommand(name,fn);return this;}
 status(){return this.governor.status();}
}
module.exports={AEHostAdapterV9};
