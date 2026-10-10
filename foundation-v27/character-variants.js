"use strict";
const {generateCharacter}=require("./character-generator");
function generateVariants(base,count=3){ const styles=["modern","corporate","minimal"]; const hair=["short","medium","curly","long"]; const out=[]; for(let i=0;i<count;i++) out.push(generateCharacter({...base,id:`${base.id||"character"}-v${i+1}`,style:styles[i%styles.length],hairStyle:hair[i%hair.length]})); return out; }
module.exports={generateVariants};
