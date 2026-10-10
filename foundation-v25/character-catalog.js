"use strict";
const characters={
  "ae-boss-puppet-v1":{name:"AE BOSS Original Puppet",rig:"original-2d-puppet-v1",slots:["head","body","leftArm","rightArm","leftLeg","rightLeg"],controllers:["root","head","body","leftArm","rightArm","leftLeg","rightLeg"],actions:["idle","walk","talk","point","wave","think","celebrate","present","enter","exit"]}
};
const aliases={
  "walk":["walk","walk normal","راه برو","وارد شو"],
  "talk":["talk","talking","explain","صحبت","توضیح"],
  "point":["point","pointing","اشاره"],
  "wave":["wave","greeting","دست تکان","سلام"],
  "think":["think","thinking","فکر"],
  "celebrate":["celebrate","cheer","happy","جشن"],
  "present":["present","presentation","معرفی","ارائه"],
  "idle":["idle","ایست","ساکن"],
  "enter":["enter","ورود"],
  "exit":["exit","خروج"]
};
function actions(){return characters["ae-boss-puppet-v1"].actions.slice();}
function normalizeAction(value){const t=String(value||"").toLowerCase(); for(const k of Object.keys(aliases)) if(aliases[k].some(x=>t.indexOf(String(x).toLowerCase())>=0)) return k; return null;}
module.exports={characters,aliases,actions,normalizeAction};
