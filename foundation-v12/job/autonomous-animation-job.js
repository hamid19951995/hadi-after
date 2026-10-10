class AutonomousAnimationJob {
 constructor(runtime){this.runtime=runtime;}
 async run(spec){ const snap=spec.snapshot; await this.runtime.snapshot(snap); try { await this.runtime.createComp(spec.comp,spec.width,spec.height,spec.duration,spec.frameRate); await this.runtime.addSolid(spec.comp,spec.layer,spec.color); await this.runtime.setProperty(spec.comp,spec.layer,'ADBE Transform Group/ADBE Position',spec.position); await this.runtime.enqueueRender(spec.comp,spec.output); await this.runtime.render(); return {status:'DONE',snapshot:snap,output:spec.output}; } catch(e){ await this.runtime.restore(snap); throw e; } }
}
module.exports={AutonomousAnimationJob};
