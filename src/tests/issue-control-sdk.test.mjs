import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createIssueControl } from '../packages/sdlc/src/issue-control.mjs';
import { createIssueControlManifest } from '../packages/sdlc/src/issue-control-contract.mjs';
import { createControlRequest, createControlResult, controlResultBody } from '../packages/sdlc/src/issue-control-ledger.mjs';
import { createIssueIntent, issueIntentKey, issueIntentDigest, issueIntentEffect } from '../packages/sdlc/src/issue-control-intent.mjs';

const id = '12345678-1234-4234-8234-123456789abc';
const router = '# lighthouse-issue-control:v1\non:\n  workflow_dispatch:\n    inputs:\n      client_request:\n        type: string\nenv:\n  LIGHTHOUSE_ENABLED_STAGES: triage,refine,propose\n  LIGHTHOUSE_AUTO_IMPLEMENT: true\n  LIGHTHOUSE_COMPLETION_ENABLED: true\n  LIGHTHOUSE_PRODUCT_CHANGE_ENABLED: false\n';
function file(text) {
  const bytes = Buffer.from(text);
  return { type: 'file', size: bytes.length, encoding: 'base64', content: bytes.toString('base64'), sha: createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex') };
}
function fixture() {
  const owner = { id: 11, login: 'owner', type: 'User' };
  const state = { actor: owner, issue: { id: 33, number: 7, state: 'open', user: owner, title: 'Intent', body: 'Observe', labels: [] },
    revision: 'a'.repeat(40), automation: true, comments: [], calls: [], posts: 0, lost: false, journal: new Map(), controlRequest: null, controlResult: null };
  const options = { repository: 'owner/repo', readArtifact: async (_api, _repository, _run, name) => name.startsWith('lighthouse-issue-control-result-') ? state.controlResult : state.controlRequest,
    readAuthority: async () => ({ actorId: state.actor.id, repositoryId: 22, commentWrite: true, dispatchWrite: true }),
    transport: async request => {
      state.calls.push(request);
      const { scope, path, method } = request;
      if (scope === 'account') { assert.equal(path, 'user'); assert.equal(method, 'GET'); return state.actor; }
      assert.equal(scope, 'repository'); assert.equal(request.repository, 'owner/repo');
      if (method === 'POST') {
        state.posts++;
        if (path === 'issues/7/comments') {
          const comment = { id: 500 + state.posts, user: state.actor, body: request.body.body,
            html_url: `https://github.com/owner/repo/issues/7#issuecomment-${500 + state.posts}`, issue_url: 'https://api.github.com/repos/owner/repo/issues/7' };
          state.comments.push(comment);
          if (state.lost) throw Error('Response lost after publication');
          return comment;
        }
        assert.equal(path, 'actions/workflows/lighthouse-sdlc-router.yml/dispatches'); assert.equal(request.apiVersion, '2026-03-10');
        if (state.lost) throw Error('Response lost after dispatch');
        return { workflow_run_id: 44, html_url: 'https://github.com/owner/repo/actions/runs/44' };
      }
      assert.equal(method, 'GET');
      if (path === '') return { id: 22, full_name: 'owner/repo', owner, default_branch: 'main' };
      if (path === 'issues/7') return state.issue;
      if (path === 'commits/main') return { sha: state.revision };
      if (path.startsWith('issues/7/comments?')) return state.comments;
      if (path.startsWith('contents/.lighthouse/issue-control.json')) return file(JSON.stringify(createIssueControlManifest(router)));
      if (path.startsWith('contents/.github/workflows/')) return file(router);
      if (path.startsWith('actions/variables/')) return { name: path.split('/').at(-1), value: path.endsWith('AUTOMATION_ENABLED') && state.automation ? 'true' : 'false' };
      if (path === 'actions/runs/44/attempts/1') return { id: 44, run_attempt: 1, repository: { full_name: 'owner/repo' },
        path: '.github/workflows/lighthouse-sdlc-router.yml', head_sha: 'a'.repeat(40), actor: owner, triggering_actor: owner, event: state.controlEvent ?? 'workflow_dispatch' };
      throw Error('Unexpected transport path ' + path);
    } };
  const claim = async ({ key, payloadDigest, intent }) => {
    const existing = state.journal.get(key);
    if (existing) return { state: existing.payloadDigest === payloadDigest ? 'existing' : 'conflict' };
    state.journal.set(key, { payloadDigest, intent }); return { state: 'claimed' };
  };
  const acknowledge = prepared => {
    state.controlRequest = createControlRequest(prepared.intent, 'a'.repeat(40), 44, 1, prepared.intent.action === 'continue' ? { commentId: 501 } : {});
    state.controlEvent = prepared.intent.action === 'continue' ? 'issue_comment' : 'workflow_dispatch';
    state.controlResult = createControlResult(state.controlRequest, { status: 'admitted', dispatchCommentId: 91 });
    state.comments.push({ id: 90, user: { login: 'github-actions[bot]', type: 'Bot' }, issue_url: 'https://api.github.com/repos/owner/repo/issues/7',
      body: controlResultBody(createControlResult(state.controlRequest, { status: 'admitted', dispatchCommentId: 91 })) });
  };
  return { state, options, claim, acknowledge, sdk: createIssueControl(options) };
}

test('SDK observes and prepares via explicit read-only transport without ambient credentials or network', async t => {
  const { state, sdk } = fixture(); t.mock.method(globalThis, 'fetch', () => { throw Error('Ambient network forbidden'); });
  const observed = await sdk.observe({ number: 7 }); assert.equal(observed.actions.refine.eligible, true);
  const prepared = await sdk.prepare({ number: 7, action: 'refine', id });
  assert.equal(prepared.intent.scope, 'stage-only'); assert.equal(prepared.effect.body.inputs.workflow, 'stage');
  assert.ok(!Object.hasOwn(prepared.effect.body.inputs, 'auto_implement')); assert.equal(state.posts, 0);
  assert.ok(state.calls.every(call => call.method === 'GET'));
});

test('concurrent callers sharing an atomic journal make one POST and distinguish router from worker', async () => {
  const { state, options, sdk, claim } = fixture(); const prepared = await sdk.prepare({ number: 7, action: 'refine', id });
  const results = await Promise.all([sdk.submit(prepared, { claim }), createIssueControl(options).submit(prepared, { claim })]);
  assert.equal(state.posts, 1); assert.equal(state.journal.size, 1);
  const sent = results.find(result => result.state === 'submitted'); assert.equal(sent.routerRunId, 44); assert.equal(sent.workerRunId, null);
  assert.equal(sent.sourceAcknowledged, false); assert.equal(sent.questionResolved, false);
});

test('lost dispatch response and recreated SDK reconcile the original before changed-source freshness', async () => {
  const { state, options, sdk, claim, acknowledge } = fixture(); const prepared = await sdk.prepare({ number: 7, action: 'refine', id });
  state.lost = true; assert.equal((await sdk.submit(prepared, { claim })).state, 'unknown'); assert.equal(state.posts, 1);
  acknowledge(prepared); state.revision = 'b'.repeat(40); state.issue.state = 'closed'; state.automation = false;
  const result = await createIssueControl(options).submit(prepared, { claim });
  assert.equal(result.state, 'source-admitted'); assert.equal(result.routerRunId, 44); assert.equal(result.questionResolved, false);
  assert.equal(state.posts, 1);
});

test('unknown original effects are never resent and changed payload conflicts in the same namespace', async () => {
  const { state, sdk, claim } = fixture(); const prepared = await sdk.prepare({ number: 7, action: 'refine', id });
  state.lost = true; await sdk.submit(prepared, { claim });
  assert.equal((await sdk.submit(prepared, { claim })).state, 'unknown'); assert.equal(state.posts, 1);
  const intent = { ...prepared.intent, action: 'propose' };
  const changed = { version: 1, intent, key: issueIntentKey(intent), payloadDigest: issueIntentDigest(intent), effect: issueIntentEffect(intent) };
  assert.equal(changed.key, prepared.key); assert.equal((await sdk.submit(changed, { claim })).state, 'conflict'); assert.equal(state.posts, 1);
});

test('ordinary comments publish as the actual user and reconcile lost responses without resuming a wait', async () => {
  const { state, options, sdk, claim } = fixture(); state.automation = false;
  const prepared = await sdk.prepare({ number: 7, action: 'comment', id, body: '/product-change approve example\r\nThis remains ordinary data.' });
  assert.equal(prepared.intent.scope, 'comment-only'); assert.ok(!prepared.intent.body.includes('\r\n'));
  state.lost = true; assert.equal((await sdk.submit(prepared, { claim })).state, 'unknown');
  const result = await createIssueControl(options).submit(prepared, { claim });
  assert.equal(result.state, 'comment-published'); assert.equal(result.questionResolved, false); assert.equal(state.posts, 1);
  assert.equal(state.comments[0].user.id, 11);
});

test('changed source binding, lost authority and caller-claim failure stop before POST', async () => {
  for (const scenario of ['source', 'actor', 'closed', 'journal']) {
    const { state, sdk, claim } = fixture(); const prepared = await sdk.prepare({ number: 7, action: 'refine', id });
    if (scenario === 'source') state.revision = 'b'.repeat(40);
    if (scenario === 'actor') state.actor = { id: 99, login: 'foreign', type: 'User' };
    if (scenario === 'closed') state.issue.state = 'closed';
    const result = await sdk.submit(prepared, { claim: scenario === 'journal' ? async () => { throw Error('Journal unavailable'); } : claim });
    assert.ok(['rejected', 'unknown'].includes(result.state)); assert.equal(state.posts, 0);
  }
});

test('tampered effects and unsupported actions cannot become arbitrary provider writes', async () => {
  const { state, sdk, claim } = fixture(); const prepared = await sdk.prepare({ number: 7, action: 'refine', id });
  await assert.rejects(sdk.submit({ ...prepared, effect: { ...prepared.effect, path: 'pulls/1/merge' } }, { claim }), /binding changed/);
  await assert.rejects(sdk.prepare({ number: 7, action: 'merge', id }), /Unsupported/);
  await assert.rejects(sdk.submit(prepared), /durable atomic/); assert.equal(state.posts, 0);
});

test('observation exposes the verified question without its private source request object', async () => {
  const { state, options, claim } = fixture(); state.issue.labels = [{ name: 'needs-info' }];
  const { taskDigest } = await import('../packages/sdlc/src/digests.mjs');
  const request = { runId: 'd'.repeat(64), workflowRunId: '77', issue: 7, stage: 'refine', sourceRevision: state.revision,
    taskDigest: taskDigest(state.issue, []), debugContext: 'server-only-context' };
  const envelope = { schemaVersion: 1, result: { schemaVersion: 1, runId: request.runId, stage: 'refine', gate: 'ready', status: 'blocked',
    evidence: [], missingEvidence: [], unavailableChecks: [], pendingReview: [], nextAction: 'Owner: answer', output: { handoff: { question: 'Which repository?' } } },
    effect: { type: 'issue-comment', body: 'Waiting for the repository.' } };
  state.comments = [{ id: 78, created_at: '2026-01-01T00:00:00Z', user: { login: 'github-actions[bot]', type: 'Bot' }, body: `Outcome: blocked\n<!-- lighthouse-actions:${request.runId} -->\n<!-- lighthouse-stage:refine:blocked -->\n<!-- lighthouse-question -->\n[Workflow run](https://github.com/owner/repo/actions/runs/77)` }];
  const transport = options.transport;
  options.transport = async input => input.path === 'actions/runs/77' ? { id: 77, run_attempt: 1, status: 'completed', conclusion: 'success', event: 'workflow_dispatch',
    path: '.github/workflows/lighthouse-sdlc-router.yml', actor: state.actor, head_sha: state.revision } : transport(input);
  options.readArtifact = async (_api, _repo, _run, _name, member) => member === 'request.json' ? request : envelope;
  const result = await createIssueControl(options).observe({ number: 7 });
  assert.equal(result.question.text, 'Which repository?'); assert.equal(result.question.current, true);
  assert.equal(Object.hasOwn(result.question, 'request'), false); assert.ok(!JSON.stringify(result).includes('server-only-context'));
  options.readArtifact = async (_api, _repo, _run, _name, member) => member === 'request.json' ? Object.fromEntries(Object.entries(request).reverse()) : envelope;
  const { formatIssueComment } = await import('../packages/sdlc/src/issue-comment-intent.mjs');
  state.comments.push({ id: 80, user: state.actor, created_at: '2026-01-02T00:00:00Z', updated_at: '2026-01-02T00:00:00Z', body: formatIssueComment({ id: '12345678-1234-4234-8234-123456789abe', actorId: 11, body: 'An ordinary status note.' }) });
  const reordered = await createIssueControl(options).observe({ number: 7 });
  assert.equal(reordered.question.current, true, 'An ordinary note after the question does not revoke the original reply grant');
  assert.equal(reordered.question.grantDigest, result.question.grantDigest, 'Transport object key order cannot change the original grant');
  assert.equal(reordered.question.sourceCreatedAt, '2026-01-01T00:00:00Z');
  delete state.comments[0].created_at;
  const undated = await createIssueControl(options).observe({ number: 7 });
  assert.equal(undated.question.sourceCreatedAt, null); assert.equal(undated.question.inputFreshness, 'unavailable');
  assert.equal(undated.actions.continue.eligible, false);
  state.comments[0].created_at = '2026-01-01T00:00:00Z';
  const controls = createIssueControl(options);
  const answer = await controls.prepare({ number: 7, action: 'continue', id, body: 'Observe owner/repo' });
  state.comments[0].id = 79;
  const changed = await controls.submit(answer, { claim });
  assert.equal(changed.state, 'rejected'); assert.equal(changed.reason, 'source-binding-changed'); assert.equal(state.posts, 0);
  const currentAnswer = await controls.prepare({ number: 7, action: 'continue', id: '12345678-1234-4234-8234-123456789abd', body: 'Observe owner/repo' });
  const submitted = await controls.submit(currentAnswer, { claim });
  assert.equal(submitted.state, 'submitted'); assert.equal(submitted.sourceAcknowledged, false); assert.equal(submitted.questionResolved, false);
  assert.equal(state.posts, 1);
  request.epic = { parent: 8 };
  const unsupported = await createIssueControl(options).observe({ number: 7 });
  assert.equal(unsupported.question.text, 'Which repository?'); assert.equal(unsupported.question.availability, 'unsupported');
  assert.equal(unsupported.actions.continue.eligible, false);
  envelope.result.runId = 'e'.repeat(64);
  const invalid = await createIssueControl(options).observe({ number: 7 });
  assert.equal(invalid.question.availability, 'unavailable'); assert.equal(invalid.question.text, undefined);
});

test('provider diagnostic text is withheld from observation, preparation and reconciliation outcomes', async () => {
  const { options, sdk } = fixture(); const prepared = await sdk.prepare({ number: 7, action: 'refine', id });
  options.transport = async () => { throw Error('PRIVATE_PROVIDER_DIAGNOSTIC'); };
  const broken = createIssueControl(options);
  const results = [await broken.observe({ number: 7 }), await broken.prepare({ number: 7, action: 'refine', id }), await broken.reconcile(prepared)];
  assert.equal(results[0].availability, 'unavailable'); assert.equal(results[1].state, 'unavailable'); assert.equal(results[2].state, 'unknown');
  assert.ok(!JSON.stringify(results).includes('PRIVATE_PROVIDER_DIAGNOSTIC'));
});

test('multiple comments for one persisted intent are a conflict and cannot cause another POST', async () => {
  const { state, sdk, claim } = fixture(); const prepared = await sdk.prepare({ number: 7, action: 'comment', id, body: 'One note' });
  await sdk.submit(prepared, { claim });
  state.comments.push({ ...state.comments[0], id: 599, html_url: 'https://github.com/owner/repo/issues/7#issuecomment-599' });
  const result = await sdk.submit(prepared, { claim });
  assert.equal(result.state, 'conflict'); assert.equal(result.reason, 'multiple-comment-effects'); assert.equal(state.posts, 1);
});

test('equivalent source work does not acknowledge a new client key before a durable alias exists', async () => {
  const { sdk, acknowledge, state } = fixture();
  const original = await sdk.prepare({ number: 7, action: 'refine', id }); acknowledge(original);
  const next = await sdk.prepare({ number: 7, action: 'refine', id: '12345678-1234-4234-8234-123456789abd' });
  const result = await sdk.reconcile(next);
  assert.equal(result.state, 'equivalent-observed'); assert.equal(result.sourceAcknowledged, false);
  assert.equal(result.sourceKey, original.key); assert.equal(state.posts, 0);
});

test('confirmed original continuation reconciles before an edited or deleted current response comment', async () => {
  const { sdk, acknowledge, state } = fixture(); const base = await sdk.prepare({ number: 7, action: 'refine', id });
  const intent = createIssueIntent({ id, action: 'continue', body: 'My original answer', facts: { repository: base.intent.repository, issue: base.intent.issue,
    actor: { id: base.intent.actorId }, question: { commentId: 71, requestId: 'a'.repeat(64), questionDigest: 'b'.repeat(64), grantDigest: 'c'.repeat(64) } } });
  const prepared = { version: 1, intent, key: issueIntentKey(intent), payloadDigest: issueIntentDigest(intent), effect: issueIntentEffect(intent) };
  acknowledge(prepared); state.issue.state = 'closed';
  const result = await sdk.reconcile(prepared);
  assert.equal(result.state, 'source-admitted'); assert.equal(result.commentId, 501); assert.equal(result.questionResolved, false);
  assert.equal(state.posts, 0);
});
