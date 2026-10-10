'use strict';
function buildMetrics(result,startedAt,finishedAt){const ms=finishedAt-startedAt; return {ok:!!result.ok,durationMs:ms,completed:(result.completed||[]).length,journalEntries:(result.journal||[]).length,journalValid:!!result.journalValid,throughputPerSecond:ms>0?Number((((result.completed||[]).length*1000)/ms).toFixed(3)):null};}
module.exports={buildMetrics};
