const assert=require('assert');const {AuditChain}=require('../runtime/audit-chain');const a=new AuditChain();a.append({x:1});a.append({x:2});assert(a.verify());console.log('v104 PASS');
