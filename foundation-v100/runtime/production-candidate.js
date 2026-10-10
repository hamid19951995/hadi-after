function evaluate(x){if(!x.localReady)return 'BLOCKED';if(!x.liveEvidence)return 'LIVE_TEST_REQUIRED';return x.liveCertified?'LIVE_CERTIFIED':'LIVE_TEST_REQUIRED'}module.exports={evaluate};
