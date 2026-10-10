"use strict";
function toAutonomousManifest(scene,brief,output){const sc=scene.scenes[0];const [w,h]=(brief.format||"1920x1080").split("x").map(Number);const layers=[];const keyframes=[];
 for(const l of sc.layers){if(l.type==="asset") layers.push({name:l.name,type:"shape",color:[0.2,0.4,0.6]}); else if(l.type==="text") layers.push({name:l.name,type:"text",text:l.role.toUpperCase()}); else layers.push({name:l.name,type:"shape",color:[0.4,0.5,0.7]});
  const anim=String(l.props&&l.props.animation||""); if(anim){keyframes.push({layer:l.name,property:"ADBE Transform Group/ADBE Opacity",time:0,value:0},{layer:l.name,property:"ADBE Transform Group/ADBE Opacity",time:Math.min(0.8,sc.duration/4),value:100});}}
 return {jobId:"creative-"+brief.id,comp:"AE_BOSS_"+brief.family,width:w||1920,height:h||1080,duration:brief.duration,frameRate:30,output:output.path||"./output/"+brief.id+".mov",projectPath:output.projectPath||"./output/"+brief.id+".aep",layers,keyframes,folders:["AE_BOSS_ASSETS","AE_BOSS_SCENES","AE_BOSS_OUTPUT"],assets:output.assets||[],retry:{maxAttempts:3},creative:{family:scene.family,style:scene.style,palette:scene.palette,referencePolicy:scene.referencePolicy,audio:scene.audio}};
}
module.exports={toAutonomousManifest};
