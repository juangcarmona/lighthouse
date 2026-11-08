import { digest } from './digests.mjs';
import { formatIssueComment } from './issue-comment-intent.mjs';

export const issueControlActions = ['refine', 'propose', 'comment', 'continue'];
const positive = value => Number.isSafeInteger(value) && value > 0;
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value);
export const validControlRepository = value => typeof value === 'string' && !/[\x00-\x1f\x7f]/.test(value)
  && /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/.test(value) && value.split('/').every(part => !['.', '..'].includes(part));
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const keys = (value, names) => plain(value) && Object.keys(value).length === names.length && names.every(name => Object.hasOwn(value, name));
const sorted = value => Array.isArray(value) ? value.map(sorted) : plain(value) ? Object.fromEntries(Object.keys(value).sort().map(key => [key, sorted(value[key])])) : value;
export const canonicalIssueIntent = value => JSON.stringify(sorted(value));

export function validateIssueIntent(value) {
  const stage = value?.action === 'refine' || value?.action === 'propose';
  const continuation = value?.action === 'continue';
  const names = ['version', 'id', 'repository', 'issue', 'actorId', 'action', 'scope', ...(stage ? ['binding'] : ['body']), ...(continuation ? ['question'] : [])];
  if (!keys(value, names) || value.version !== 1 || !uuid(value.id) || !issueControlActions.includes(value.action)
      || !positive(value.actorId) || !keys(value.repository, ['id', 'name']) || !positive(value.repository.id)
      || typeof value.repository.name !== 'string' || value.repository.name !== value.repository.name.toLowerCase()
      || !validControlRepository(value.repository.name)
      || !keys(value.issue, ['id', 'number']) || !positive(value.issue.id) || !positive(value.issue.number)
      || value.scope !== (stage ? 'stage-only' : continuation ? 'original-grant' : 'comment-only')) throw Error('Malformed or unsupported issue-control intent');
  if (stage) {
    if (!keys(value.binding, ['sourceRevision', 'defaultBranch', 'inputDigest', 'policyDigest', 'capabilityDigest']) || !/^[a-f0-9]{40}$/.test(value.binding.sourceRevision ?? '')
        || typeof value.binding.defaultBranch !== 'string' || !value.binding.defaultBranch || value.binding.defaultBranch.length > 256 || /[\x00-\x1f\x7f]/.test(value.binding.defaultBranch)
        || ['inputDigest', 'policyDigest', 'capabilityDigest'].some(name => !hash(value.binding[name]))) throw Error('Invalid source intent binding');
  } else {
    if (typeof value.body !== 'string' || !value.body.isWellFormed() || !value.body.trim() || value.body.includes('\r\n')) throw Error('Invalid canonical comment text');
    formatIssueComment({ body: value.body, id: value.id, actorId: value.actorId, intent: continuation ? 'continue' : 'comment', ...(continuation ? { question: value.question } : {}) });
  }
  if (Buffer.byteLength(canonicalIssueIntent(value)) > 128000) throw Error('Typed intent exceeds the existing source artifact bound');
  return value;
}

export function parseIssueIntent(text) {
  if (typeof text !== 'string' || !text.isWellFormed() || Buffer.byteLength(text) > 128000) throw Error('Typed intent exceeds the source input bound');
  let value;
  try { value = JSON.parse(text); } catch { throw Error('Malformed typed intent JSON'); }
  validateIssueIntent(value);
  if (canonicalIssueIntent(value) !== text) throw Error('Typed intent JSON is not canonical');
  return value;
}

export function createIssueIntent({ id, facts, action, body }) {
  const stage = ['refine', 'propose'].includes(action), continuation = action === 'continue';
  const value = { version: 1, id, repository: { id: facts.repository.id, name: facts.repository.name.toLowerCase() },
    issue: { id: facts.issue.id, number: facts.issue.number }, actorId: facts.actor.id, action,
    scope: stage ? 'stage-only' : continuation ? 'original-grant' : 'comment-only',
    ...(stage ? { binding: { sourceRevision: facts.sourceRevision, defaultBranch: facts.defaultBranch, inputDigest: facts.inputDigest, policyDigest: facts.policy?.digest, capabilityDigest: facts.capability?.digest } }
      : { body: typeof body === 'string' ? body.replace(/\r\n/g, '\n') : body }),
    ...(continuation ? { question: Object.fromEntries(['commentId', 'requestId', 'questionDigest', 'grantDigest'].map(name => [name, facts.question?.[name]])) } : {}) };
  return validateIssueIntent(value);
}

export function issueIntentKey(value) {
  validateIssueIntent(value);
  return digest(canonicalIssueIntent([value.repository.id, value.issue.id, value.actorId, value.id]));
}
export function issueIntentDigest(value) {
  validateIssueIntent(value);
  const { id, ...payload } = value;
  return digest(canonicalIssueIntent(payload));
}
export function issueIntentEffect(value) {
  validateIssueIntent(value);
  return ['refine', 'propose'].includes(value.action)
    ? { kind: 'dispatch', path: 'actions/workflows/lighthouse-sdlc-router.yml/dispatches', body: { ref: value.binding.defaultBranch,
      inputs: { issue: String(value.issue.number), stage: value.action, workflow: 'stage', client_request: canonicalIssueIntent(value) } }, apiVersion: '2026-03-10' }
    : { kind: 'comment', path: `issues/${value.issue.number}/comments`, body: { body: formatIssueComment({ body: value.body, id: value.id, actorId: value.actorId,
      intent: value.action === 'continue' ? 'continue' : 'comment', ...(value.action === 'continue' ? { question: value.question } : {}) }) } };
}
