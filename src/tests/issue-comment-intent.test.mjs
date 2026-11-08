import test from 'node:test';
import assert from 'node:assert/strict';
import { formatIssueComment, parseIssueComment, legacyControlComment } from '../packages/sdlc/src/issue-comment-intent.mjs';

const id = '46c9f511-4176-43f1-ab65-38fd6211d615';
const actorId = 71;
const comment = body => ({ body, user: { id: actorId, type: 'User' } });
const encoded = body => formatIssueComment({ body, id, actorId });

test('ordinary typed source text preserves commands and whitespace as data, with CRLF normalization only', () => {
  const body = '  /implement\r\nApprove this product change\n\n';
  const result = parseIssueComment(comment(encoded(body)));
  assert.equal(result.kind, 'typed'); assert.equal(result.intent, 'comment');
  assert.equal(result.body, body.replace(/\r\n/g, '\n')); assert.equal(result.actorId, actorId); assert.equal(result.id, id);
  assert.equal(legacyControlComment(comment(encoded(body))), false);
  assert.equal(legacyControlComment(comment('/implement')), true);
});

test('edited text, wrong actor, bot and malformed or unknown metadata cannot reach legacy controls', () => {
  const body = encoded('/approve');
  for (const value of [body.replace('/approve', '/implement'), body.replace(':v1:', ':v2:'), body + '\n', body.replace(/ -->$/, ''), '<!-- lighthouse-issue-control:broken -->\n/implement', '<!-- lighthouse-issue-control -->\n/approve']) {
    assert.equal(parseIssueComment(comment(value)).kind, 'invalid'); assert.equal(legacyControlComment(comment(value)), false);
  }
  assert.equal(parseIssueComment({ ...comment(body), user: { id: 72, type: 'User' } }).kind, 'invalid');
  assert.equal(parseIssueComment({ ...comment(body), user: { id: actorId, type: 'Bot' } }).kind, 'invalid');
  assert.equal(parseIssueComment({ body }).kind, 'invalid');
});

test('explicit continuation requires the exact question and original-grant identity', () => {
  const question = { commentId: 900, requestId: 'a'.repeat(64), questionDigest: 'b'.repeat(64), grantDigest: 'c'.repeat(64) };
  const body = formatIssueComment({ body: 'My answer', id, actorId, intent: 'continue', question });
  const parsed = parseIssueComment(comment(body)); assert.equal(parsed.intent, 'continue'); assert.deepEqual(parsed.question, question);
  assert.throws(() => formatIssueComment({ body: 'Answer', id, actorId, intent: 'continue' }));
  assert.throws(() => formatIssueComment({ body: 'Answer', id, actorId, question }));
  assert.throws(() => formatIssueComment({ body: 'Answer', id, actorId, intent: 'continue', question: { ...question, extra: true } }));
});

test('complete serialized comment respects the byte bound without truncating multibyte text', () => {
  const overhead = Buffer.byteLength(encoded('x')) - 1;
  const body = 'x'.repeat(48 * 1024 - overhead);
  assert.equal(Buffer.byteLength(encoded(body)), 48 * 1024);
  assert.equal(parseIssueComment(comment(encoded(body))).body, body);
  assert.throws(() => encoded(body + 'x'));
  assert.throws(() => encoded('é'.repeat(24 * 1024)));
  assert.throws(() => encoded('bad\ud800'));
});
