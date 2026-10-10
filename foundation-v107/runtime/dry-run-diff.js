function diff(expected, actual){const keys=[...new Set([...Object.keys(expected||{}),...Object.keys(actual||{})])].sort();const changes=[];for(const k of keys){if(JSON.stringify(expected[k])!==JSON.stringify(actual[k]))changes.push({key:k,expected:expected[k],actual:actual[k]})}return {equal:changes.length===0,changes};}
module.exports={diff};
