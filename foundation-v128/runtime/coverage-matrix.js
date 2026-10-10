'use strict';
function build(requirements,evidence){const set=new Set(evidence);const rows=requirements.map(id=>({id,covered:set.has(id)}));return {rows,covered:rows.filter(r=>r.covered).length,total:rows.length,ratio:rows.length?rows.filter(r=>r.covered).length/rows.length:1,complete:rows.every(r=>r.covered)};}
module.exports={build};
