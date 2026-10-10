class RetryBudget { constructor({maxAttempts=3, maxTotalMs=30000, now=()=>Date.now()}={}){this.maxAttempts=maxAttempts;this.maxTotalMs=maxTotalMs;this.now=now;} canRetry({attempt,startedAt}){return attempt<this.maxAttempts && this.now()-startedAt<=this.maxTotalMs;} delay(attempt,baseMs=250,maxMs=5000){return Math.min(maxMs,baseMs*Math.pow(2,Math.max(0,attempt-1)));}}
module.exports={RetryBudget};
