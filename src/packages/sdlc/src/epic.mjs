import { createHash } from 'node:crypto';
import { buildDecompositionPlan } from './decompose.mjs';
import { validateEstimate } from './request-triage.mjs';

const text = value => typeof value === 'string' && value.trim().length > 0;
const sha = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const positive = value => Number.isSafeInteger(value) && value > 0;

// Refinement proposes work; neither a valid plan nor its digest is authority to execute.
export function assessDecomposition(output) {
  const errors = validateEstimate(output?.estimate);
  if (output?.estimate?.status !== 'confirmed') errors.push('refinement estimate must be confirmed');
  if (errors.length) return { status: 'invalid', required: false, errors };
  if (output.estimate.points <= 8) return { status: 'not-required', required: false, errors: [] };
  const split = output.decomposition;
  if (text(split?.noSafeSplitReason) && text(split?.question)) return { status: 'blocked', required: true, reason: split.noSafeSplitReason, question: split.question, errors: [] };
  const plan = buildDecompositionPlan(split);
  return { status: plan.valid ? 'planned' : 'invalid', required: true, plan, errors: plan.errors.map(error => error.message) };
}

export function epicPlanDigest(plan) {
  const checked = buildDecompositionPlan(plan);
  if (!plan?.valid || !checked.valid) throw Error('A valid decomposition plan is required');
  const canonical = { schemaVersion: 1, parent: { id: checked.parent.id, title: checked.parent.title }, slices: [...checked.slices].sort((a, b) => a.id.localeCompare(b.id)) };
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

// Input is a trusted host observation, not data parsed from issue/PR markers.
// Consumers must refresh it under their parent lease immediately before effects.
export function assessEpic(plan, observation) {
  const errors = [];
  const checked = buildDecompositionPlan(plan);
  if (!plan?.valid || !checked.valid) errors.push('valid non-empty decomposition plan required');
  if (observation?.schemaVersion !== 1 || observation?.authenticated !== true) errors.push('authenticated version 1 host observation required');
  if (!sha(observation?.baseSha) || !text(observation?.epicBranch) || !text(observation?.defaultBranch) || observation.epicBranch === observation.defaultBranch) errors.push('dedicated epic branch and current base SHA required');
  if (!positive(observation?.capacity) || !Array.isArray(observation?.children)) errors.push('positive capacity and child observations required');
  if (plan?.valid && checked.valid && observation?.planDigest !== epicPlanDigest(plan)) errors.push('observation does not match the immutable plan');
  const children = Array.isArray(observation?.children) ? observation.children : [];
  const ids = new Set();
  for (const child of children) {
    if (!child || !plan?.slices?.some(slice => slice.id === child.id) || ids.has(child.id)) errors.push('unknown or duplicate child observation');
    ids.add(child?.id);
  }
  if (errors.length) return { schemaVersion: 1, status: 'invalid', children: [], aggregate: 'blocked', errors };
  const byId = new Map(children.map(child => [child.id, child]));
  const accepted = child => child?.authenticated === true && child?.state === 'accepted' && child?.pr?.merged === true && child.pr.base === observation.epicBranch && sha(child.pr.head) && child.acceptance?.head === child.pr.head && sha(child.acceptance?.baseSha) && child.acceptance?.checks === 'passed' && child.acceptance?.ownerDecision === true && child.acceptance?.included === true;
  let slots = Math.max(0, observation.capacity - children.filter(child => child?.state === 'running').length);
  const results = checked.order.map(id => {
    const slice = plan.slices.find(item => item.id === id), child = byId.get(id);
    const result = { id, state: 'blocked', dependencies: [...slice.dependencies] };
    if (!child) return { ...result, state: 'uncreated' };
    if (child.authenticated !== true) return { ...result, state: 'uncertain', reason: 'child identity is not authenticated' };
    if (!['ready', 'running', 'accepted', 'cancelled', 'uncertain', 'blocked'].includes(child.state)) return { ...result, state: 'uncertain', reason: 'child state is closed or unrecognized' };
    if (['cancelled', 'uncertain', 'blocked'].includes(child.state)) return { ...result, state: child.state };
    if (child.state === 'running') return { ...result, state: 'running' };
    if (child.questions?.length) return { ...result, state: 'waiting-answer', questions: child.questions };
    if (accepted(child)) return { ...result, state: 'accepted' };
    if (child.state === 'accepted') return { ...result, state: 'uncertain', reason: 'accepted outcome lacks merge and decision evidence' };
    if (child.triage !== 'passed') return { ...result, state: 'needs-triage' };
    if (child.refinement !== 'passed') return { ...result, state: child.authorized?.refine === true ? 'needs-refinement' : 'waiting-refinement-authorization' };
    const waiting = slice.dependencies.filter(dependency => !accepted(byId.get(dependency)));
    if (waiting.length) return { ...result, state: 'waiting-dependencies', waiting };
    if (child.pr) {
      if (child.pr.base !== observation.epicBranch) return { ...result, state: 'wrong-base' };
      if (!sha(child.pr.head) || child.evidence?.head !== child.pr.head || child.evidence?.baseSha !== observation.baseSha || child.evidence?.checks !== 'passed') return { ...result, state: 'needs-revalidation' };
      if (child.ownerDecision?.head !== child.pr.head || child.ownerDecision?.baseSha !== observation.baseSha || child.ownerDecision?.approved !== true) return { ...result, state: 'waiting-owner' };
      return { ...result, state: 'merge-eligible' };
    }
    if (child.authorized?.implement !== true) return { ...result, state: 'waiting-implementation-authorization' };
    if (!slots) return { ...result, state: 'waiting-capacity' };
    slots--;
    return { ...result, state: 'implementation-eligible' };
  });
  return { schemaVersion: 1, status: 'assessed', children: results, aggregate: results.every(child => child.state === 'accepted') ? 'publication-eligible' : 'waiting-children', parent: 'open', errors: [] };
}
