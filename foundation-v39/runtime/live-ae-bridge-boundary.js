class LiveAEBridgeBoundary{
 constructor({transport}){if(!transport)throw new Error('TRANSPORT_REQUIRED');this.transport=transport;}
 async preview(operation){return this.transport.send({phase:'PREVIEW',operation});}
 async apply(operation){return this.transport.send({phase:'APPLY',operation});}
 async readback(operation){return this.transport.send({phase:'READBACK',operation});}
}
module.exports={LiveAEBridgeBoundary};
