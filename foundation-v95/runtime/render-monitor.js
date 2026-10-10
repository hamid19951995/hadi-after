function assess(q){const outputOk=!!q.output&&q.output.exists===true&&q.output.bytes>0;return {state:q.state||'UNKNOWN',complete:q.state==='DONE'&&outputOk,outputOk}}module.exports={assess};
