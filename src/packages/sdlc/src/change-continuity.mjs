import { taskDigest } from './digests.mjs';

export function retainedChangeContext(request, issue) {
  return {
    schemaVersion: 1,
    workItem: { repository: request.repository ?? null, number: request.issue ?? issue.number ?? null, url: issue.html_url ?? null, revision: issue.updated_at ?? null, taskDigest: request.taskDigest ?? null },
    sourceRevision: request.sourceRevision ?? null,
    decisionOwner: request.repository?.split('/')[0] ?? 'repository owner',
    inputs: { intentAndCriteria: 'issue.title and issue.body', questionsAndDecisions: 'issue.ownerAnswers and predecessor/refinement evidence', interpretation: 'Admitted task data and retained observations; product approval requires its authenticated source.' },
    authorities: { product: 'ProductShape: .product/config.yaml and its accepted model', architecture: 'ArcShape: installed provider configuration and architecture sources', instructions: 'Repository AGENTS.md and its applicable pointers; host projections retain their own ownership.' },
  };
}

export function assertRetainedIntent(request, issue, answers) {
  if (taskDigest(issue, answers) !== request.taskDigest) throw Error(`Issue or owner answers changed; request refinement again. Decision owner: ${request.repository?.split('/')[0] ?? 'repository owner'}. Retain the previous intent and authenticate a fresh continuation.`);
}

export const instructionReviewContract = {
  schemaVersion: 1, status: 'reviewed | not-applicable | blocked', reason: 'Scope and evidence for this assessment',
  sources: [{ path: 'repository-relative guidance path', owner: 'project or owning provider', status: 'current | corrected | host-specific | stale | conflict | missing', evidence: 'Exact source, implementation or owning-tool check supporting this finding' }],
};

export function validateInstructionReview(value, files) {
  const errors = [], text = value => typeof value === 'string' && value.trim() && value.length <= 4000;
  const path = value => typeof value === 'string' && value.length <= 512 && !/[\\\0]/.test(value) && !value.startsWith('/') && value.split('/').every(p => p && p !== '.' && p !== '..');
  if (!value || Object.keys(value).sort().join(',') !== 'reason,schemaVersion,sources,status' || value.schemaVersion !== 1 || !['reviewed', 'not-applicable', 'blocked'].includes(value.status) || !text(value.reason) || !Array.isArray(value.sources) || value.sources.length > 100) return ['Instruction review must identify its version, status, scope reason and bounded source findings'];
  if (value.status === 'blocked') errors.push('Unresolved instruction drift requires the named owner before completion');
  if (value.status === 'reviewed' && !value.sources.length || value.status === 'not-applicable' && value.sources.length) errors.push('Instruction review scope and source findings disagree');
  const seen = new Set();
  for (const source of value.sources) {
    if (!source || Object.keys(source).sort().join(',') !== 'evidence,owner,path,status' || !path(source.path) || seen.has(source.path) || !text(source.owner) || !text(source.evidence) || !['current', 'corrected', 'host-specific', 'stale', 'conflict', 'missing'].includes(source.status)) { errors.push('Instruction review has an invalid, duplicate or unowned source finding'); continue; }
    seen.add(source.path);
    if (['stale', 'conflict', 'missing'].includes(source.status)) errors.push(`Instruction ${source.status}: ${source.path}; responsible owner: ${source.owner}`);
    if (files && !files.has(source.path)) errors.push(`Reviewed instruction source is absent from the candidate: ${source.path}`);
  }
  return errors;
}
