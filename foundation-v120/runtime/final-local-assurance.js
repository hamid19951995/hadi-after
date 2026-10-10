function evaluate(input){const checks={deepCanonical:input.deepCanonical===true,modelOracle:input.modelOracle===true,invariants:input.invariants===true,recordReplay:input.recordReplay===true,previousGate:input.previousGate===true};const ok=Object.values(checks).every(Boolean);return {status:ok?'LOCAL_ASSURANCE_MAX':'BLOCKED',checks};}
module.exports={evaluate};
