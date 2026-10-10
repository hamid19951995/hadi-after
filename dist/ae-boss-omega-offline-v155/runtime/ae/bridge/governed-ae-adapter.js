const {BridgeProtocolV1} = require("./bridge-protocol-v1");

class GovernedAEAdapter {
  constructor({send, protocol=new BridgeProtocolV1()}={}) {
    if (typeof send !== "function") throw new Error("send required");
    this.send = send;
    this.protocol = protocol;
  }

  async dryRun(operation) {
    const env = this.protocol.create({
      operationId:operation.operationId,
      phase:"DRY_RUN",
      action:operation.action,
      target:operation.target,
      parameters:operation.parameters || {},
      authorization:operation.authorization || {},
      specHash:operation.specHash || null
    });
    this.protocol.validate(env);
    return this.send(env);
  }

  async apply(operation) {
    const env = this.protocol.create({
      operationId:operation.operationId,
      phase:"APPLY",
      action:operation.action,
      target:operation.target,
      parameters:operation.parameters || {},
      authorization:operation.authorization || {},
      specHash:operation.specHash || null
    });
    this.protocol.validate(env);
    return this.send(env);
  }

  async readback(operation) {
    const env = this.protocol.create({
      operationId:operation.operationId,
      phase:"READBACK",
      action:operation.action,
      target:operation.target,
      authorization:operation.authorization || {},
      specHash:operation.specHash || null
    });
    this.protocol.validate(env);
    return this.send(env);
  }
}
module.exports = {GovernedAEAdapter};
