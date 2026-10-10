"use strict";
const v30=require("../foundation-v30");
const engine=require("./character-prop-intelligence");
function planCharacterPropJob(input={}){
  const base=v30.planCharacterInteractionJob(input);
  const characters=input.characters||[base.character];
  const props=input.props||[];
  const actions=input.propActions||input.characterPropActions||[];
  const propPlan=engine.planCharacterPropIntelligence({characters,props,actions,fps:input.fps,sceneDuration:base.scene.duration});
  return {...base,characterPropIntelligence:propPlan};
}
module.exports={...v30,...engine,planCharacterPropJob};
