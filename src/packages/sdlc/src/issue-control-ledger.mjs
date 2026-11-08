import { digest } from './digests.mjs';
import { canonicalIssueIntent, validateIssueIntent, issueIntentKey, issueIntentDigest } from './issue-control-intent.mjs';
import { issueComments } from './stage-dispatch.mjs';

const marker = '<!-- lighthouse-issue-control-result:v1:';
const positive = value => Number.isSafeInteger(value) && value > 0;
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const exact = (value, names) => value && !Array.isArray(value) && typeof value === 'object'
  && Object.keys(value).length === names.length && names.every(name => Object.hasOwn(value, name));

const readOnly = api => (path, method = 'GET', body, optional = false) => {
  if (method !== 'GET' || body !== undefined) throw Error('Control reconciliation cannot write');
  return api(path, method, undefined, optional);
};

export function controlRequestArtifact(run, attempt) {
  if (!positive(run) || !positive(attempt)) throw Error('Invalid control execution identity');
  return `lighthouse-issue-control-${run}-${attempt}`;
}
export function controlResultArtifact(run, attempt) {
  controlRequestArtifact(run, attempt);
  return `lighthouse-issue-control-result-${run}-${attempt}`;
}
export function createControlRequest(intent, sourceRevision, routerRunId, routerAttempt, { commentId = null } = {}) {
  validateIssueIntent(intent);
  controlRequestArtifact(routerRunId, routerAttempt);
  if (!/^[a-f0-9]{40}$/.test(sourceRevision ?? '') || !['refine', 'propose', 'continue'].includes(intent.action)
      || (intent.action === 'continue' ? !positive(commentId) : commentId !== null)) throw Error('Unsupported source control request');
  return { version: 1, intent, sourceRevision, routerRunId, routerAttempt, commentId };
}
function validateRequest(request) {
  if (!exact(request, ['version', 'intent', 'sourceRevision', 'routerRunId', 'routerAttempt', 'commentId']) || request.version !== 1
      || canonicalIssueIntent(createControlRequest(request.intent, request.sourceRevision, request.routerRunId, request.routerAttempt, { commentId: request.commentId })) !== canonicalIssueIntent(request))
    throw Error('Malformed source control request');
  return request;
}
function validateResult(result) {
  if (!exact(result, ['version', 'key', 'payloadDigest', 'requestDigest', 'routerRunId', 'routerAttempt', 'status', 'dispatchCommentId', 'aliasKey', 'reason'])
      || result.version !== 1 || !['key', 'payloadDigest', 'requestDigest'].every(name => hash(result[name]))
      || !positive(result.routerRunId) || !positive(result.routerAttempt) || !['claimed', 'rejected', 'admitted', 'alias'].includes(result.status)) throw Error('Malformed control result');
  if (result.status === 'claimed' && (result.dispatchCommentId !== null || result.aliasKey !== null || result.reason !== null)
      || result.status === 'rejected' && (result.dispatchCommentId !== null || result.aliasKey !== null || !/^[a-z][a-z0-9-]{0,79}$/.test(result.reason ?? ''))
      || result.status === 'admitted' && (!positive(result.dispatchCommentId) || result.aliasKey !== null || result.reason !== null)
      || result.status === 'alias' && (!hash(result.aliasKey) || result.aliasKey === result.key || result.dispatchCommentId !== null || result.reason !== null))
    throw Error('Invalid control result state');
  return result;
}
export function createControlResult(request, { status, dispatchCommentId = null, aliasKey = null, reason = null }) {
  validateRequest(request);
  return validateResult({ version: 1, key: issueIntentKey(request.intent), payloadDigest: issueIntentDigest(request.intent),
    requestDigest: digest(canonicalIssueIntent(request)), routerRunId: request.routerRunId, routerAttempt: request.routerAttempt,
    status, dispatchCommentId, aliasKey, reason });
}
export function controlResultBody(result) {
  validateResult(result);
  return `Source issue-control result: ${result.status}.\n\n${marker}${Buffer.from(canonicalIssueIntent(result)).toString('base64url')} -->`;
}
export function parseControlResult(comment, repository, number) {
  if (comment.user?.login !== 'github-actions[bot]' || comment.user.type !== 'Bot'
      || comment.issue_url?.toLowerCase() !== `https://api.github.com/repos/${repository}/issues/${number}`.toLowerCase() || !positive(comment.id))
    throw Error('Untrusted source control result');
  const matches = [...(comment.body ?? '').matchAll(/<!-- lighthouse-issue-control-result:v1:([A-Za-z0-9_-]{1,4096}) -->/g)];
  if (matches.length !== 1 || comment.body.split('<!-- lighthouse-issue-control-result:').length !== 2) throw Error('Missing or unsupported control result');
  const bytes = Buffer.from(matches[0][1], 'base64url');
  if (bytes.toString('base64url') !== matches[0][1]) throw Error('Noncanonical control result');
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes), result = JSON.parse(text);
  if (canonicalIssueIntent(result) !== text) throw Error('Noncanonical control result');
  return validateResult(result);
}

export async function loadControlResult({ api, repository, number, issueId, actor, metadata, comment, readArtifact }) {
  api = readOnly(api);
  let result = parseControlResult(comment, repository, number);
  const run = await api(`actions/runs/${result.routerRunId}/attempts/${result.routerAttempt}`);
  const request = validateRequest(await readArtifact(api, repository, String(result.routerRunId), controlRequestArtifact(result.routerRunId, result.routerAttempt), 'request.json'));
  if (run.id !== result.routerRunId || run.run_attempt !== result.routerAttempt || run.repository?.full_name?.toLowerCase() !== repository.toLowerCase()
      || run.path !== '.github/workflows/lighthouse-sdlc-router.yml' || run.head_sha !== request.sourceRevision
      || run.actor?.id !== actor.id || run.actor?.type !== 'User' || run.triggering_actor?.id !== actor.id
      || run.triggering_actor?.type !== 'User' || metadata.owner?.id !== actor.id || metadata.owner.type !== 'User'
      || request.routerRunId !== run.id || request.routerAttempt !== run.run_attempt || request.intent.actorId !== actor.id
      || request.intent.repository.id !== metadata.id || request.intent.repository.name !== repository.toLowerCase()
      || request.intent.issue.number !== number || request.intent.issue.id !== issueId
      || run.event !== (request.intent.action === 'continue' ? 'issue_comment' : 'workflow_dispatch')
      || digest(canonicalIssueIntent(request)) !== result.requestDigest || issueIntentKey(request.intent) !== result.key
      || issueIntentDigest(request.intent) !== result.payloadDigest) throw Error('Control result provenance mismatch');
  const outcome = await readArtifact(api, repository, String(result.routerRunId), controlResultArtifact(result.routerRunId, result.routerAttempt), 'result.json', true);
  if (outcome !== null) {
    validateResult(outcome);
    if (outcome.status === 'claimed' || ['version', 'key', 'payloadDigest', 'requestDigest', 'routerRunId', 'routerAttempt'].some(key => outcome[key] !== result[key])
        || result.status !== 'claimed' && canonicalIssueIntent(outcome) !== canonicalIssueIntent(result)) throw Error('Control outcome artifact does not match its receipt');
    result = outcome;
  } else if (result.status !== 'claimed') throw Error('Terminal control outcome is not authenticated');
  return { result, request, commentId: comment.id, source: `https://github.com/${repository}/issues/${number}#issuecomment-${comment.id}`,
    outcomeSource: outcome === null ? null : `https://github.com/${repository}/actions/runs/${result.routerRunId}/attempts/${result.routerAttempt}` };
}

// Reconciliation precedes freshness: an existing intent never gains another POST.
export async function findControlResult({ api, repository, intent, actor, metadata, readArtifact }) {
  validateIssueIntent(intent);
  api = readOnly(api);
  if (intent.actorId !== actor.id || intent.repository.id !== metadata.id || metadata.full_name?.toLowerCase() !== repository.toLowerCase()) throw Error('Control target or acting identity changed');
  const issue = await api(`issues/${intent.issue.number}`);
  if (issue.id !== intent.issue.id || issue.number !== intent.issue.number || issue.pull_request) throw Error('Control issue identity changed');
  const key = issueIntentKey(intent), payload = issueIntentDigest(intent), records = [];
  for (const comment of await issueComments(api, intent.issue.number)) {
    if (comment.user?.login !== 'github-actions[bot]' || comment.user.type !== 'Bot' || !comment.body?.includes('<!-- lighthouse-issue-control-result:')) continue;
    const result = parseControlResult(comment, repository, intent.issue.number);
    if (result.key !== key && result.payloadDigest !== payload) continue;
    records.push(await loadControlResult({ api, repository, number: intent.issue.number, issueId: issue.id, actor, metadata, comment, readArtifact }));
  }
  const same = records.filter(record => record.result.key === key);
  if (same.some(record => record.result.payloadDigest !== payload)) return { state: 'conflict', records: same };
  if (same.length > 1) return { state: 'unknown', reason: 'multiple-source-results', records: same };
  if (same.length) return { state: 'recorded', record: same[0] };
  const equivalent = records.filter(record => record.result.payloadDigest === payload && record.result.status !== 'alias');
  return equivalent.length ? { state: 'equivalent', record: equivalent.at(-1) } : { state: 'unknown', reason: 'source-result-not-observed' };
}
