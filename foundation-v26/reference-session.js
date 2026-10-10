"use strict";
function createReferenceSession(input){
 if(!input||!input.path) throw new Error("REFERENCE_AEP_PATH_REQUIRED");
 return {kind:"external-aep-reference-session.v1",path:String(input.path),mode:"inspect-in-host",readOnly:true,copyAssets:false,extractAssets:false,requiresAdobeAfterEffects:true,inspectionOutput:"ae-project-inspection.v1"};
}
module.exports={createReferenceSession};
