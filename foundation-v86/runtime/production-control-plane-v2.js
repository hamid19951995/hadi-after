const {BackpressureController}=require('../../foundation-v81/runtime/backpressure');const {score}=require('../../foundation-v83/runtime/health-model');
class ProductionControlPlaneV2 { constructor({backpressure=new BackpressureController()}={}){this.backpressure=backpressure;} admit({queueDepth,health}){const bp=this.backpressure.update(queueDepth);const h=score(health);if(!bp.paused&&h.status!=='UNHEALTHY')return {ok:true,health:h,bp};return {ok:false,reason:bp.paused?'BACKPRESSURE':'UNHEALTHY_RUNTIME',health:h,bp};} }
module.exports={ProductionControlPlaneV2};
