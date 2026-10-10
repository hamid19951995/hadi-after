function resolve(flags,ctx){const out={};for(const [k,v] of Object.entries(flags)){out[k]=typeof v==='object'?!!v.when.every(r=>ctx[r.key]===r.equals):!!v;}return out}module.exports={resolve};
