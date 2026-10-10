function diff(a,b){const keys=[...new Set(Object.keys(a||{}).concat(Object.keys(b||{})))].sort(); return keys.filter(k=>JSON.stringify(a[k])!==JSON.stringify(b[k])).map(k=>({key:k,left:a[k],right:b[k]}));}
module.exports={diff};
