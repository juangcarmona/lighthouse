import test from 'node:test';
import assert from 'node:assert/strict';
import { createIssueIntent, canonicalIssueIntent } from '../packages/sdlc/src/issue-control-intent.mjs';
import { createControlRequest } from '../packages/sdlc/src/issue-control-ledger.mjs';
import { formatIssueComment } from '../packages/sdlc/src/issue-comment-intent.mjs';
import { controlEventIntent, validateControlRouter, controlStageDispatch } from '../packages/sdlc/src/issue-control-admission.mjs';

function fixture(action = 'refine') {
  const actor = { id: 11, type: 'User', login: 'owner' }, repository = 'owner/repo';
  const metadata = { id: 22, full_name: repository, owner: actor, default_branch: 'main' };
  const facts = { availability: 'available', repository: { id: 22, name: repository }, issue: { id: 33, number: 7 }, actor,
    sourceRevision: 'a'.repeat(40), defaultBranch: 'main', inputDigest: 'b'.repeat(64),
    policy: { digest: 'c'.repeat(64), autoImplement: true, productChangeEnabled: true },
    capability: { digest: 'd'.repeat(64), stages: ['triage', 'refine', 'propose', 'implement'] },
    actions: { refine: { eligible: true }, propose: { eligible: true }, continue: { eligible: true } },
    question: { stage: 'refine', commentId: 70, requestId: 'e'.repeat(64), questionDigest: 'f'.repeat(64), grantDigest: 'a'.repeat(64),
      request: { autoImplement: false, productChangeEnabled: false } } };
  const intent = createIssueIntent({ id: '12345678-1234-4234-8234-123456789abc', facts, action, body: 'My answer' });
  const eventName = action === 'continue' ? 'issue_comment' : 'workflow_dispatch';
  const event = action === 'continue' ? { action: 'created', sender: actor, issue: { id: 33, number: 7 }, comment: { id: 80, user: actor,
    body: formatIssueComment({ id: intent.id, actorId: actor.id, intent: 'continue', body: intent.body, question: intent.question }) } }
    : { sender: actor, inputs: { issue: '7', stage: action, workflow: 'stage', merge: 'false', client_request: canonicalIssueIntent(intent) } };
  const request = createControlRequest(intent, facts.sourceRevision, 44, 1, action === 'continue' ? { commentId: 80 } : {});
  const run = { id: 44, run_attempt: 1, path: '.github/workflows/lighthouse-sdlc-router.yml', event: eventName,
    head_sha: facts.sourceRevision, head_branch: 'main', repository: metadata, actor, triggering_actor: actor };
  return { actor, repository, metadata, facts, intent, eventName, event, request, run, owner: 'owner', runId: 44, attempt: 1 };
}

test('typed stage entry cannot inherit global implementation or product-change authority', () => {
  for (const action of ['refine', 'propose']) {
    const f = fixture(action); assert.deepEqual(controlEventIntent(f), f.intent); validateControlRouter(f);
    const native = controlStageDispatch(f);
    assert.equal(native.stage, action); assert.equal(native.autoImplement, false); assert.equal(native.productChangeEnabled, false);
    assert.equal(native.handoff, false); assert.equal(native.client.scope, 'stage-only');
    for (const injected of [{ merge: 'true' }, { model_selection: '{}' }, { workflow: 'product-change' }, { after_run: '1' }, { epic_parent: '8' }])
      assert.throws(() => controlEventIntent({ ...f, event: { ...f.event, inputs: { ...f.event.inputs, ...injected } } }), /mixed-client/);
  }
});

test('a continuation preserves only the original grant and refuses changed source responses', () => {
  const f = fixture('continue'); assert.deepEqual(controlEventIntent(f), f.intent);
  let native = controlStageDispatch(f); assert.equal(native.autoImplement, false); assert.equal(native.productChangeEnabled, false);
  f.facts.question.request = { autoImplement: true, productChangeEnabled: true };
  native = controlStageDispatch(f); assert.equal(native.autoImplement, true); assert.equal(native.productChangeEnabled, true);
  f.facts.policy.autoImplement = false; assert.equal(controlStageDispatch(f).autoImplement, false);
  assert.throws(() => controlStageDispatch({ ...f, currentComment: { ...f.event.comment, body: 'Edited response' } }), /source-comment-changed/);
  f.facts.question.request.modelSelection = { profile: 'custom' };
  assert.throws(() => controlStageDispatch(f), /pending-grant-context-unsupported/);
});

test('ordinary comment text, actor mismatch and canonical denial never create a native request', () => {
  const f = fixture('continue');
  const ordinary = { ...f, event: { ...f.event, comment: { ...f.event.comment, body: formatIssueComment({ id: f.intent.id, actorId: f.actor.id, body: '/product-change approve text' }) } } };
  assert.equal(controlEventIntent(ordinary), null);
  assert.throws(() => controlEventIntent({ ...f, actor: { ...f.actor, id: 99 } }), /owner-identity/);
  f.facts.actions.continue = { eligible: false, reason: 'authenticated-source-reservation' };
  assert.throws(() => controlStageDispatch(f), /authenticated-source-reservation/);
});

test('router provenance and current dispatch source are independent mandatory guards', () => {
  const f = fixture(); validateControlRouter(f);
  assert.throws(() => validateControlRouter({ ...f, run: { ...f.run, triggering_actor: { ...f.actor, id: 99 } } }), /router-origin/);
  assert.throws(() => controlStageDispatch({ ...f, run: { ...f.run, head_sha: 'b'.repeat(40) } }), /current-source-router/);
  assert.throws(() => controlStageDispatch({ ...f, facts: { ...f.facts, sourceRevision: 'b'.repeat(40) } }), /source-binding/);
});
