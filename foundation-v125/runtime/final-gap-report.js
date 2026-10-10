function assess(input){const required=['liveAE','cep','jsx','render','evidence']; const missing=required.filter(k=>!input[k]); return {status:missing.length?'LIVE_GAPS_REMAIN':'LIVE_CERTIFIED',missing,localStatus:input.localStatus||'UNKNOWN'};}
module.exports={assess};
