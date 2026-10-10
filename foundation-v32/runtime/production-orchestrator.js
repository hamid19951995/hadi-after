'use strict';
const crypto = require('crypto');

const ACTIONS = new Set(['walk','run','idle','talk','point','present','sit','stand','wave','think','celebrate']);
const PROP_ACTIONS = new Set(['pickUp','attach','carry','use','place','handoff','detach','drop']);
const INTERACTIONS = new Set(['lookAt','faceTo','approach','distance','gestureSync','dialogueTurn','pointTo','follow','handoff','avoidance']);

function stable(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  return '{' + Object.keys(value).sort().map(k => JSON.stringify(k)+':'+stable(value[k])).join(',') + '}';
}
function hash(value) { return crypto.createHash('sha256').update(stable(value)).digest('hex'); }
function fingerprintPlan(plan) {
  const copy = JSON.parse(JSON.stringify(plan)); delete copy.fingerprint; return hash(copy);
}
function ensureArray(v, code) { if (!Array.isArray(v)) throw new Error(code); return v; }
function validateProductionPlan(plan) {
  if (!plan || typeof plan !== 'object') throw new Error('INVALID_PRODUCTION_PLAN');
  const characters = ensureArray(plan.characters || [], 'CHARACTERS_REQUIRED');
  const props = ensureArray(plan.props || [], 'PROPS_REQUIRED');
  const actions = ensureArray(plan.actions || [], 'ACTIONS_REQUIRED');
  const interactions = ensureArray(plan.interactions || [], 'INTERACTIONS_REQUIRED');
  const charIds = new Set(characters.map(c=>c && c.id));
  const propIds = new Set(props.map(p=>p && p.id));
  if (charIds.has(undefined) || charIds.size !== characters.length) throw new Error('INVALID_CHARACTER_IDS');
  if (propIds.has(undefined) || propIds.size !== props.length) throw new Error('INVALID_PROP_IDS');
  for (const a of actions) {
    if (!ACTIONS.has(a.action)) throw new Error('UNSUPPORTED_ACTION');
    if (!charIds.has(a.characterId)) throw new Error('UNKNOWN_ACTION_CHARACTER');
    if (!(Number(a.start) >= 0 && Number(a.duration) > 0)) throw new Error('INVALID_ACTION_TIMING');
  }
  for (const i of interactions) {
    if (!INTERACTIONS.has(i.type)) throw new Error('UNSUPPORTED_INTERACTION');
    if (!charIds.has(i.sourceCharacterId)) throw new Error('UNKNOWN_INTERACTION_SOURCE');
    if (i.targetCharacterId != null && !charIds.has(i.targetCharacterId)) throw new Error('UNKNOWN_INTERACTION_TARGET');
    if (i.propId != null && !propIds.has(i.propId)) throw new Error('UNKNOWN_INTERACTION_PROP');
    if (!(Number(i.start) >= 0 && Number(i.duration) > 0)) throw new Error('INVALID_INTERACTION_TIMING');
  }
  for (const p of plan.propActions || []) {
    if (!PROP_ACTIONS.has(p.action)) throw new Error('UNSUPPORTED_PROP_ACTION');
    if (!charIds.has(p.characterId)) throw new Error('UNKNOWN_PROP_CHARACTER');
    if (!propIds.has(p.propId)) throw new Error('UNKNOWN_PROP');
    if (!(Number(p.start) >= 0 && Number(p.duration) > 0)) throw new Error('INVALID_PROP_TIMING');
  }
  const sceneDuration = Number(plan.sceneDuration || 0);
  if (!(sceneDuration > 0)) throw new Error('INVALID_SCENE_DURATION');
  const maxEnd = [...actions, ...interactions, ...(plan.propActions || [])].reduce((m,x)=>Math.max(m, Number(x.start)+Number(x.duration)),0);
  if (maxEnd > sceneDuration + 1e-9) throw new Error('PLAN_EXCEEDS_SCENE');
  return true;
}

function buildGraph(plan) {
  const nodes = [];
  for (const c of plan.characters) nodes.push({id:`character:${c.id}`, kind:'character'});
  for (const p of plan.props) nodes.push({id:`prop:${p.id}`, kind:'prop'});
  const edges = [];
  for (const a of plan.actions) edges.push({from:`character:${a.characterId}`, to:`action:${a.id}`, relation:'performs'});
  for (const i of plan.interactions) {
    edges.push({from:`character:${i.sourceCharacterId}`, to:`interaction:${i.id}`, relation:'sources'});
    if (i.targetCharacterId) edges.push({from:`interaction:${i.id}`, to:`character:${i.targetCharacterId}`, relation:'targets'});
    if (i.propId) edges.push({from:`interaction:${i.id}`, to:`prop:${i.propId}`, relation:'uses'});
  }
  for (const p of plan.propActions || []) {
    edges.push({from:`character:${p.characterId}`, to:`prop:${p.propId}`, relation:p.action});
  }
  return {nodes, edges};
}

function detectConflicts(plan) {
  const events = [];
  for (const a of plan.actions) events.push({id:a.id, resource:`char:${a.characterId}`, start:+a.start, end:+a.start + +a.duration, type:'action'});
  for (const i of plan.interactions) events.push({id:i.id, resource:`char:${i.sourceCharacterId}`, start:+i.start, end:+i.start + +i.duration, type:'interaction'});
  for (const p of plan.propActions || []) events.push({id:p.id, resource:`prop:${p.propId}`, start:+p.start, end:+p.start + +p.duration, type:'prop'});
  const conflicts=[];
  for(let x=0;x<events.length;x++) for(let y=x+1;y<events.length;y++) {
    const a=events[x], b=events[y];
    if(a.resource===b.resource && a.start < b.end && b.start < a.end) conflicts.push({a:a.id,b:b.id,resource:a.resource});
  }
  return conflicts;
}

function buildProductionPlan(input) {
  const plan = JSON.parse(JSON.stringify(input));
  plan.kind = 'offline-production-plan.v1';
  plan.engine = 'AE BOSS OMEGA Production Intelligence';
  plan.engineVersion = '32.0.0';
  plan.characters = plan.characters || [];
  plan.props = plan.props || [];
  plan.actions = (plan.actions || []).map((x,i)=>Object.assign({},x,{id:x.id || `action-${i+1}`}));
  plan.interactions = (plan.interactions || []).map((x,i)=>Object.assign({},x,{id:x.id || `interaction-${i+1}`}));
  plan.propActions = (plan.propActions || []).map((x,i)=>Object.assign({},x,{id:x.id || `prop-action-${i+1}`}));
  validateProductionPlan(plan);
  plan.graph = buildGraph(plan);
  plan.conflicts = detectConflicts(plan);
  plan.execution = {mode:'offline-deterministic', networkRequired:false, cacheable:true, resumable:true};
  plan.fingerprint = fingerprintPlan(plan);
  return plan;
}

module.exports = { buildProductionPlan, validateProductionPlan, fingerprintPlan, buildGraph, detectConflicts };
