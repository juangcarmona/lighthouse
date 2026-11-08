import test from 'node:test';
import assert from 'node:assert/strict';
import { createIssueIntent, validateIssueIntent, parseIssueIntent, canonicalIssueIntent, issueIntentKey, issueIntentDigest, issueIntentEffect } from '../packages/sdlc/src/issue-control-intent.mjs';
import { parseIssueComment } from '../packages/sdlc/src/issue-comment-intent.mjs';

const id = '46c9f511-4176-43f1-ab65-38fd6211d615';
const facts = { repository: { id: 42, name: 'Owner/Repo' }, issue: { id: 70, number: 7 }, actor: { id: 71 }, defaultBranch: 'main',
  sourceRevision: 'a'.repeat(40), inputDigest: 'b'.repeat(64), policy: { digest: 'c'.repeat(64) }, capability: { digest: 'd'.repeat(64) },
  question: { commentId: 800, requestId: 'e'.repeat(64), questionDigest: 'f'.repeat(64), grantDigest: '0'.repeat(64) } };
const intent = action => createIssueIntent({ id, facts, action, body: 'Source text\r\n' });

test('source key excludes action and payload; payload binding detects reuse with changed intent', () => {
  const first = intent('refine'), changed = intent('propose');
  assert.equal(issueIntentKey(first), issueIntentKey(changed)); assert.notEqual(issueIntentDigest(first), issueIntentDigest(changed));
  assert.notEqual(issueIntentKey(first), issueIntentKey({ ...first, id: '56c9f511-4176-43f1-ab65-38fd6211d615' }));
  assert.equal(issueIntentDigest(first), issueIntentDigest({ ...first, id: '56c9f511-4176-43f1-ab65-38fd6211d615' }));
  assert.notEqual(issueIntentKey(first), issueIntentKey({ ...first, actorId: 72 }));
  assert.deepEqual(parseIssueIntent(canonicalIssueIntent(first)), first);
});

test('stage-only source requests cannot carry merge, product or model-selection grants', () => {
  const first = intent('refine'); const effect = issueIntentEffect(first);
  assert.equal(first.scope, 'stage-only'); assert.equal(effect.body.ref, 'main'); assert.equal(effect.apiVersion, '2026-03-10');
  assert.deepEqual(Object.keys(effect.body.inputs).sort(), ['client_request', 'issue', 'stage', 'workflow']);
  assert.equal(parseIssueIntent(effect.body.inputs.client_request).binding.sourceRevision, facts.sourceRevision);
  for (const key of ['merge', 'modelSelection', 'productChangeEnabled']) assert.throws(() => validateIssueIntent({ ...first, [key]: true }));
  assert.throws(() => validateIssueIntent({ ...first, scope: 'original-grant' }));
  assert.throws(() => parseIssueIntent(JSON.stringify(first)), /canonical/);
});

test('ordinary comments preserve actual actor and text; continuation binds the original source question', () => {
  for (const action of ['comment', 'continue']) {
    const value = intent(action); const effect = issueIntentEffect(value);
    const parsed = parseIssueComment({ body: effect.body.body, user: { id: 71, type: 'User' } });
    assert.equal(parsed.kind, 'typed'); assert.equal(parsed.body, 'Source text\n'); assert.equal(parsed.intent, action);
    assert.equal(effect.path, 'issues/7/comments');
    if (action === 'continue') assert.deepEqual(parsed.question, facts.question);
    else assert.equal(parsed.question, undefined);
  }
});

test('unknown keys, invalid targets, raw CRLF and unsupported versions fail closed', () => {
  const first = intent('comment');
  for (const value of [{ ...first, version: 2 }, { ...first, body: 'raw\r\n' }, { ...first, actorId: '71' },
    { ...first, repository: { ...first.repository, name: '../repo' } }, { ...first, issue: { ...first.issue, extra: true } }])
    assert.throws(() => validateIssueIntent(value));
  assert.throws(() => parseIssueIntent(canonicalIssueIntent(first) + ' '));
  assert.throws(() => createIssueIntent({ id, facts, action: 'implement' }));
});
