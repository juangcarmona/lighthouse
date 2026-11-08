import test from 'node:test';
import assert from 'node:assert/strict';
import { createIssueIntent, issueIntentKey } from '../packages/sdlc/src/issue-control-intent.mjs';
import { createControlRequest, createControlResult, controlResultBody, findControlResult, parseControlResult } from '../packages/sdlc/src/issue-control-ledger.mjs';

const uuid = '12345678-1234-4234-8234-123456789abc';
function fixture() {
  const actor = { id: 11, login: 'owner', type: 'User' };
  const metadata = { id: 22, full_name: 'owner/repo', owner: actor };
  const facts = { repository: { id: 22, name: 'owner/repo' }, issue: { id: 33, number: 7 }, actor,
    sourceRevision: 'a'.repeat(40), defaultBranch: 'main', inputDigest: 'b'.repeat(64), policy: { digest: 'c'.repeat(64) }, capability: { digest: 'd'.repeat(64) } };
  const intent = createIssueIntent({ id: uuid, facts, action: 'refine' });
  const request = createControlRequest(intent, facts.sourceRevision, 44, 1);
  const state = { comments: [], mutations: 0, request, terminal: null,
    run: { id: 44, run_attempt: 1, repository: { full_name: 'owner/repo' }, path: '.github/workflows/lighthouse-sdlc-router.yml', head_sha: facts.sourceRevision,
      actor, triggering_actor: actor, event: 'workflow_dispatch' } };
  const options = { repository: 'owner/repo', intent, actor, metadata,
    api: async (path, method = 'GET') => {
      if (method !== 'GET') state.mutations++;
      if (path === 'issues/7') return { id: 33, number: 7, state: 'closed' };
      if (path.startsWith('issues/7/comments?')) return state.comments;
      if (path === 'actions/runs/44/attempts/1') return state.run;
      throw Error('Unexpected path ' + path);
    }, readArtifact: async (_api, repository, run, name, member) => {
      assert.equal(repository, 'owner/repo'); assert.equal(run, '44');
      if (name === 'lighthouse-issue-control-result-44-1') { assert.equal(member, 'result.json'); return state.terminal; }
      assert.equal(name, 'lighthouse-issue-control-44-1'); assert.equal(member, 'request.json');
      return state.request;
    } };
  const record = (status = 'claimed', fields = {}) => {
    const result = createControlResult(request, { status, ...fields });
    state.terminal = status === 'claimed' ? null : result;
    const comment = { id: 55, issue_url: 'https://api.github.com/repos/owner/repo/issues/7', user: { login: 'github-actions[bot]', type: 'Bot' }, body: controlResultBody(result) };
    state.comments = [comment]; return comment;
  };
  return { actor, facts, intent, request, state, options, record };
}

test('authenticated original source result remains reconcilable after the issue closes', async () => {
  const { state, options, record } = fixture(); record('admitted', { dispatchCommentId: 66 });
  const found = await findControlResult(options);
  assert.equal(found.state, 'recorded'); assert.equal(found.record.result.dispatchCommentId, 66);
  assert.equal(found.record.request.intent.scope, 'stage-only'); assert.equal(state.mutations, 0);
});

test('same stable key with changed payload conflicts before any freshness or write', async () => {
  const { facts, state, options, record } = fixture(); record();
  options.intent = createIssueIntent({ id: uuid, facts: { ...facts, inputDigest: 'e'.repeat(64) }, action: 'propose' });
  assert.equal((await findControlResult(options)).state, 'conflict'); assert.equal(state.mutations, 0);
});

test('a new UUID with the same payload resolves to the original source record', async () => {
  const { facts, intent, state, options, record } = fixture(); record();
  options.intent = createIssueIntent({ id: '12345678-1234-4234-8234-123456789abd', facts, action: 'refine' });
  const found = await findControlResult(options);
  assert.equal(found.state, 'equivalent'); assert.equal(found.record.result.key, issueIntentKey(intent)); assert.equal(state.mutations, 0);
});

test('missing, ambiguous and claimed results never invent a completed effect', async () => {
  const { state, options, record } = fixture();
  assert.equal((await findControlResult(options)).state, 'unknown');
  record(); assert.equal((await findControlResult(options)).record.result.status, 'claimed');
  state.comments.push({ ...state.comments[0], id: 56 });
  assert.equal((await findControlResult(options)).state, 'unknown'); assert.equal(state.mutations, 0);
});

test('wrong actor, workflow, revision, request payload or issue identity invalidates provenance', async () => {
  for (const mutate of [
    f => { f.state.run.actor = { ...f.actor, id: 99 }; },
    f => { f.state.run.triggering_actor = { ...f.actor, id: 99 }; },
    f => { f.state.run.path = '.github/workflows/other.yml'; },
    f => { f.state.run.head_sha = 'e'.repeat(40); },
    f => { f.state.request = { ...f.request, intent: { ...f.intent, action: 'propose' } }; },
    f => { f.options.intent = { ...f.intent, issue: { id: 99, number: 7 } }; },
  ]) {
    const f = fixture(); f.record(); mutate(f);
    await assert.rejects(findControlResult(f.options), /provenance|issue identity/); assert.equal(f.state.mutations, 0);
  }
});

test('source result state and encoding cannot turn malformed metadata into admission', () => {
  const { request, record } = fixture(); const comment = record();
  assert.equal(parseControlResult(comment, 'owner/repo', 7).status, 'claimed');
  assert.throws(() => createControlResult(request, { status: 'admitted' }), /state/);
  assert.throws(() => createControlResult(request, { status: 'alias', aliasKey: issueIntentKey(request.intent) }), /state/);
  assert.throws(() => createControlResult(request, { status: 'rejected', reason: 'raw secret or exception text' }), /state/);
  for (const value of [{ ...comment, issue_url: 'https://api.github.com/repos/foreign/repo/issues/7' }, { ...comment, user: { login: 'github-actions[bot]', type: 'User' } },
    { ...comment, body: comment.body.replace('result:v1:', 'result:v2:') }, { ...comment, body: comment.body + '\n' + comment.body }])
    assert.throws(() => parseControlResult(value, 'owner/repo', 7), /Untrusted|unsupported/);
});

test('an injected artifact reader cannot turn reconciliation into a source write', async () => {
  const { state, options, record } = fixture(); record();
  options.readArtifact = async api => api('issues/7', 'PATCH', { state: 'closed' });
  await assert.rejects(findControlResult(options), /cannot write/); assert.equal(state.mutations, 0);
});

test('editing a bot comment cannot invent a terminal outcome without the source result artifact', async () => {
  const { state, request, options, record } = fixture(); const comment = record();
  comment.body = controlResultBody(createControlResult(request, { status: 'admitted', dispatchCommentId: 99 }));
  await assert.rejects(findControlResult(options), /not authenticated/);
  assert.equal(state.mutations, 0);
});

test('an authenticated terminal artifact reconciles a lost final comment update', async () => {
  const { state, request, options, record } = fixture(); record();
  state.terminal = createControlResult(request, { status: 'admitted', dispatchCommentId: 66 });
  const found = await findControlResult(options);
  assert.equal(found.state, 'recorded'); assert.equal(found.record.result.status, 'admitted');
  assert.equal(found.record.outcomeSource, 'https://github.com/owner/repo/actions/runs/44/attempts/1');
  assert.equal(state.mutations, 0);
});
