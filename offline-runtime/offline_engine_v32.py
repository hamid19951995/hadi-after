#!/usr/bin/env python3
import hashlib, json, sys, time
VERSION='32.0.0'

def stable(v):
    return json.dumps(v, ensure_ascii=False, sort_keys=True, separators=(',',':'))

def fp(v): return hashlib.sha256(stable(v).encode('utf-8')).hexdigest()

def health(): return {'ok':True,'engine':'AE BOSS OMEGA Production Intelligence','version':VERSION,'offline':True,'networkRequired':False,'features':['graph-planning','conflict-detection','deterministic-cache-key','checkpoint-resume','runtime-audit']}

def compile_plan(plan):
    if not isinstance(plan,dict): raise ValueError('INVALID_PLAN')
    scene=float(plan.get('sceneDuration',0));
    if scene<=0: raise ValueError('INVALID_SCENE_DURATION')
    chars={str(c.get('id')) for c in plan.get('characters',[]) if isinstance(c,dict) and c.get('id')}
    props={str(p.get('id')) for p in plan.get('props',[]) if isinstance(p,dict) and p.get('id')}
    actions=[]
    for i,a in enumerate(plan.get('actions',[])):
        if str(a.get('characterId')) not in chars: raise ValueError('UNKNOWN_ACTION_CHARACTER')
        x=dict(a); x.setdefault('id',f'action-{i+1}'); x['operationKey']=fp({k:x[k] for k in ('id','action','characterId','start','duration') if k in x}); actions.append(x)
    out=dict(plan); out['engine']='AE BOSS OMEGA Production Intelligence'; out['engineVersion']=VERSION; out['kind']='offline-production-plan.v1'; out['actions']=actions; out['fingerprint']=fp(out); return out

def handle(req):
    op=req.get('op')
    if op=='health': return health()
    if op=='fingerprint': return {'ok':True,'fingerprint':fp(req.get('value'))}
    if op=='compile_plan': return {'ok':True,'plan':compile_plan(req.get('plan'))}
    if op=='network_policy': return {'ok':True,'offline':True,'networkAllowed':False,'reason':'local-only-runtime'}
    raise ValueError('UNKNOWN_OFFLINE_V32_OPERATION')

for line in sys.stdin:
    if not line.strip(): continue
    t=time.time()
    try:
        result=handle(json.loads(line)); result['elapsedMs']=round((time.time()-t)*1000,3)
    except Exception as e:
        result={'ok':False,'error':str(e),'elapsedMs':round((time.time()-t)*1000,3)}
    print(json.dumps(result,ensure_ascii=False,separators=(',',':')),flush=True)
