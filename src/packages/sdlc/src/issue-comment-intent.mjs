import { createHash } from 'node:crypto';

const marker = '<!-- lighthouse-issue-control';
const prefix = marker + ':';
const typedNamespace = /<!--\s*lighthouse-issue-control/i;
const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value);
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const positive = value => Number.isSafeInteger(value) && value > 0;
const digest = text => createHash('sha256').update(text).digest('hex');
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const keys = (value, names) => plain(value) && Object.keys(value).every(key => names.includes(key)) && names.every(key => Object.hasOwn(value, key));

function validIntent(value) {
  if (!plain(value) || !keys(value, ['version', 'id', 'actorId', 'intent', 'bodyDigest', ...(value.intent === 'continue' ? ['question'] : [])])
      || value.version !== 1 || !uuid(value.id) || !positive(value.actorId) || !['comment', 'continue'].includes(value.intent) || !hash(value.bodyDigest)) return false;
  return value.intent === 'comment' || keys(value.question, ['commentId', 'requestId', 'questionDigest', 'grantDigest'])
    && positive(value.question.commentId) && ['requestId', 'questionDigest', 'grantDigest'].every(key => hash(value.question[key]));
}

export function formatIssueComment({ body, id, actorId, intent = 'comment', question }) {
  if (typeof body !== 'string' || !body.isWellFormed() || !body.trim()) throw Error('Comment text is required');
  const text = body.replace(/\r\n/g, '\n');
  const value = { version: 1, id, actorId, intent, bodyDigest: digest(text), ...(question === undefined ? {} : { question }) };
  if (!validIntent(value)) throw Error('Invalid typed comment intent');
  const encoded = Buffer.from(JSON.stringify(value)).toString('base64url');
  const result = `${text}\n\n${prefix}v1:${encoded} -->`;
  if (Buffer.byteLength(result) > 48 * 1024) throw Error('Typed comment exceeds 48 KiB');
  return result;
}

// Typed or malformed metadata must never fall through to legacy command/approval parsers.
export function parseIssueComment(comment) {
  const body = comment?.body;
  if (typeof body !== 'string') return { kind: 'invalid', reason: 'missing-body' };
  if (!typedNamespace.test(body)) return { kind: 'legacy', body };
  const invalid = reason => ({ kind: 'invalid', reason });
  if (!body.isWellFormed() || Buffer.byteLength(body) > 48 * 1024) return invalid('comment-bound');
  const match = /^([\s\S]*)\n\n<!-- lighthouse-issue-control:v1:([A-Za-z0-9_-]{1,8192}) -->$/.exec(body);
  if (!match) return invalid('unsupported-or-malformed-footer');
  let value;
  try {
    const bytes = Buffer.from(match[2], 'base64url');
    if (bytes.toString('base64url') !== match[2]) return invalid('noncanonical-footer');
    const json = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    value = JSON.parse(json);
    if (JSON.stringify(value) !== json) return invalid('noncanonical-footer');
  } catch { return invalid('malformed-footer'); }
  if (!validIntent(value) || value.bodyDigest !== digest(match[1]) || match[1].includes('\r\n')) return invalid('invalid-body-binding');
  if (comment.user?.type !== 'User' || !positive(comment.user?.id) || comment.user.id !== value.actorId) return invalid('invalid-actor-binding');
  return { kind: 'typed', body: match[1], ...value };
}

// Legacy parsers still validate their own required fields, including empty native reviews.
export const legacyControlComment = comment => typeof comment?.body !== 'string' || !typedNamespace.test(comment.body);

export const legacyControlBody = body => legacyControlComment({ body });
