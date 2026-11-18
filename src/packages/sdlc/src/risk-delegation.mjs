import { digest } from './digests.mjs';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const keys = (value, expected) => object(value) && Object.keys(value).sort().join(',') === expected;
const text = value => typeof value === 'string' && !!value.trim() && value.length <= 4000;
const path = value => typeof value === 'string' && value.length <= 512 && !/[\\\x00-\x20:*?\[\]{}]/.test(value) && value.split('/').every(part => part && part !== '.' && part !== '..');
const contains = (prefix, value) => prefix.endsWith('/') ? value.startsWith(prefix) : value === prefix;
const hash = value => digest(JSON.stringify(value));

export const delegationAssessmentContract = {
  schemaVersion: 1,
  inherentRisk: { level: 'routine | sensitive | unknown', reversible: true, reason: 'Affected operations and reversibility', dependents: ['Affected consumer, or explicit none with evidence in reason'] },
  scope: [{ path: 'exact repository-relative file', reason: 'Concrete effect and source evidence' }],
  defects: { status: 'none | unresolved | unknown', reason: 'Findings against the intended outcome' },
  evidence: { confidence: 'sufficient | uncertain | unavailable', reason: 'Available evidence and its limits; model confidence never replaces host checks' },
};

export function validateDelegationPolicy(value) {
  if (!keys(value, 'reason,schemaVersion,stopPaths') || value.schemaVersion !== 1 || !text(value.reason) || !Array.isArray(value.stopPaths) || value.stopPaths.length > 40 || new Set(value.stopPaths).size !== value.stopPaths.length || value.stopPaths.some(p => typeof p !== 'string' || !path(p.endsWith('/') ? p.slice(0, -1) : p))) throw Error('Risk delegation needs a bounded project reason and exact sensitive files or directory prefixes');
  return value;
}

// This decision can only restrict a host-authorized composition; it grants no effects.
export function assessDelegation({ policy, binding, phase, assessment, admitted, files, checks, review }) {
  validateDelegationPolicy(policy.delegation);
  if (!keys(binding, 'issue,policyDigest,repository,route,sourceRevision,taskDigest') || !/^[\w.-]+\/[\w.-]+$/.test(binding.repository) || !Number.isSafeInteger(binding.issue) || binding.issue < 1 || !['ff', 'hotfix'].includes(binding.route) || !/^[a-f0-9]{40}$/.test(binding.sourceRevision) || ![binding.policyDigest, binding.taskDigest].every(v => /^[a-f0-9]{64}$/.test(v)) || binding.policyDigest !== hash(policy)) throw Error('Risk delegation requires current trusted repository, work-item, source, intent and policy bindings');
  if (!['admission', 'candidate', 'publication'].includes(phase)) throw Error('Unknown risk delegation phase');
  const reasons = [];
  if (!keys(assessment, 'defects,evidence,inherentRisk,schemaVersion,scope') || assessment.schemaVersion !== 1 ||
      !keys(assessment.inherentRisk, 'dependents,level,reason,reversible') || !['routine', 'sensitive', 'unknown'].includes(assessment.inherentRisk.level) || typeof assessment.inherentRisk.reversible !== 'boolean' || !text(assessment.inherentRisk.reason) || !Array.isArray(assessment.inherentRisk.dependents) || assessment.inherentRisk.dependents.length > 40 || !assessment.inherentRisk.dependents.every(text) ||
      !keys(assessment.defects, 'reason,status') || !['none', 'unresolved', 'unknown'].includes(assessment.defects.status) || !text(assessment.defects.reason) ||
      !keys(assessment.evidence, 'confidence,reason') || !['sufficient', 'uncertain', 'unavailable'].includes(assessment.evidence.confidence) || !text(assessment.evidence.reason) ||
      !Array.isArray(assessment.scope) || !assessment.scope.length || assessment.scope.length > 100 || new Set(assessment.scope.map(s => s?.path)).size !== assessment.scope.length || assessment.scope.some(s => !keys(s, 'path,reason') || !path(s.path) || !text(s.reason) || s.reason.length > 1000)) {
    reasons.push('Missing or malformed separate risk, scope, defect or evidence assessment');
  } else {
    if (assessment.inherentRisk.level !== 'routine' || !assessment.inherentRisk.reversible) reasons.push('Inherent risk or irreversibility needs the project decision owner: ' + assessment.inherentRisk.reason);
    if (assessment.defects.status !== 'none') reasons.push('Unresolved or unknown defects: ' + assessment.defects.reason);
    if (assessment.evidence.confidence !== 'sufficient') reasons.push('Uncertain or unavailable evidence: ' + assessment.evidence.reason);
    for (const surface of assessment.scope) {
      if (!policy.paths.some(p => contains(p, surface.path))) reasons.push('Assessment exceeds delegated paths: ' + surface.path);
      if (policy.delegation.stopPaths.some(p => contains(p, surface.path))) reasons.push('Project sensitive-surface rule: ' + surface.path + '; ' + policy.delegation.reason);
    }
    if (phase !== 'admission') {
      if (!admitted || admitted.status !== 'continue' || admitted.phase !== 'admission' || hash(admitted.binding) !== hash(binding) || admitted.scopeDigest !== hash(admitted.assessment?.scope)) reasons.push('Admission is missing or stale; reassess current scope and authority');
      const allowed = admitted?.assessment?.scope?.map(s => s.path) ?? [];
      if (assessment.scope.some(s => !allowed.includes(s.path))) reasons.push('Assessment scope grew; obtain fresh refinement before continuation');
      const planningRoot = `openspec/changes/issue-${binding.issue}-proposal/`;
      if (!Array.isArray(files) || !files.length || files.length > 200 || new Set(files.map(f => f?.path)).size !== files.length || files.some(f => !path(f?.path) || !assessment.scope.some(s => s.path === f.path) && !(binding.route === 'ff' && f.path.startsWith(planningRoot)))) reasons.push('Actual changed files exceed assessed scope or inventory is unavailable');
      if (Array.isArray(files)) for (const file of files) if (path(file?.path) && policy.delegation.stopPaths.some(p => contains(p, file.path))) reasons.push('Actual diff touches a project sensitive surface: ' + file.path + '; ' + policy.delegation.reason);
    }
  }
  if (phase === 'publication') {
    if (!Array.isArray(checks) || !checks.length || checks.some(c => !object(c) || c.exitCode !== 0 || c.execution?.status !== 'passed' || c.execution.exitCode !== 0 || c.execution.signal)) reasons.push('Actual independent host verification is failed or unavailable');
    if (review?.accepted !== true) reasons.push('Fresh independent candidate review is required');
  }
  return { schemaVersion: 1, status: reasons.length ? 'blocked' : 'continue', phase, binding: structuredClone(binding), scopeDigest: hash(assessment?.scope ?? null), assessment: structuredClone(assessment), reasons,
    nextAction: reasons.length ? 'Project owner: resolve the listed risk, scope or evidence finding; request fresh bounded work when authority changes.' : phase === 'publication' ? 'Continue only under the existing publication and separate integration authority.' : 'Continue the existing checks and fresh independent review within the admitted scope.' };
}
