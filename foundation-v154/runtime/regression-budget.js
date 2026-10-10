'use strict';
function assess(current,baseline,{maxFailures=0,maxLatencyRegression=0.1}={}){const failures=(current.failures||0);const ratio=(current.p95||0)/Math.max(1,baseline.p95||0)-1;return {ok:failures<=maxFailures&&ratio<=maxLatencyRegression,failures,latencyRegression:ratio};}
module.exports={assess};
