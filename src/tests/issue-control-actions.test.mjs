import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareControlInvocation, admitControlInvocation } from '../packages/sdlc/src/issue-control-actions.mjs';
import { createIssueIntent, canonicalIssueIntent } from '../packages/sdlc/src/issue-control-intent.mjs';
import { createControlRequest, createControlResult, controlResultBody } from '../packages/sdlc/src/issue-control-ledger.mjs';

function fixture() {
  const repository = 'owner/repo', actor = { id: 11, type: 'User', login: 'owner' };
  const metadata = { id: 22, full_name: repository, owner: actor, default_branch: 'main' };
  const facts = { availability: 'available', repository: { id: 22, name: repository }, issue: { id: 33, number: 7 }, actor,
    sourceRevision: 'a'.repeat(40), defaultBranch: 'main', inputDigest: 'b'.repeat(64), policy: { digest: 'c'.repeat(64), autoImplement: true, productChangeEnabled: true },
    capability: { digest: 'd'.repeat(64), stages: ['refine'] }, actions: { refine: { eligible: true } } };
  const intent = createIssueIntent({ id: '12345678-1234-4234-8234-123456789abc', facts, action: 'refine' });
  const event = { sender: actor, inputs: { issue: '7', stage: 'refine', workflow: 'stage', client_request: canonicalIssueIntent(intent) } };
  const run = { id: 44, run_attempt: 1, path: '.github/workflows/lighthouse-sdlc-router.yml', event: 'workflow_dispatch',
    head_sha: facts.sourceRevision, head_branch: 'main', repository: metadata, actor, triggering_actor: actor };
  const state = { posts: [], comments: [], writes: [], saved: null, terminal: null };
  const api = async (path, method = 'GET', body) => {
    if (method === 'POST') { state.posts.push({ path, body }); return { id: 60 + state.posts.length }; }
    if (path === '') return metadata;
    if (path === 'actions/runs/44/attempts/1') return run;
    if (path === 'issues/7') return { id: 33, number: 7, state: 'open' };
    if (path.startsWith('issues/7/comments?')) return state.comments;
    if (path.startsWith('actions/artifacts?')) return { total_count: 0, artifacts: [] };
    throw Error('Unexpected API path ' + path);
  };
  const options = { api, repository, event, eventName: 'workflow_dispatch', runId: 44, attempt: 1,
    readArtifact: async (_api, _repository, _run, name) => name.includes('-result-') ? state.terminal : createControlRequest(intent, facts.sourceRevision, 44, 1),
    collectFacts: async () => facts, writeDispatch: async value => { state.saved = value; state.writes.push('dispatch-artifact'); } };
  return { options, state, facts, intent, event };
}

test('source entry records an explicit stage-only native request without dispatching an agent', async () => {
  const { options, state } = fixture();
  const prepared = await prepareControlInvocation(options); assert.equal(prepared.state, 'new'); assert.equal(state.posts.length, 0);
  const admitted = await admitControlInvocation({ ...options, prepared });
  assert.equal(state.posts.length, 2); assert.ok(state.posts.every(post => post.path === 'issues/7/comments'));
  assert.equal(admitted.dispatchCommentId, 62); assert.equal(state.saved.autoImplement, false); assert.equal(state.saved.productChangeEnabled, false);
  assert.equal(state.saved.client.scope, 'stage-only'); assert.deepEqual(state.writes, ['dispatch-artifact']);
});

test('canonical source revocation leaves a durable rejection and never records a native request', async () => {
  const { options, state, facts } = fixture(); const prepared = await prepareControlInvocation(options);
  facts.actions.refine = { eligible: false, reason: 'automation-disabled' };
  const outcome = await admitControlInvocation({ ...options, prepared });
  assert.equal(outcome.result.status, 'rejected'); assert.equal(outcome.result.reason, 'automation-disabled');
  assert.equal(state.posts.length, 1); assert.equal(state.saved, null);
});

test('an original source receipt reconciles before changed current admission and never resends', async () => {
  const { options, state, intent, facts } = fixture();
  const request = createControlRequest(intent, facts.sourceRevision, 44, 1);
  state.terminal = createControlResult(request, { status: 'rejected', reason: 'automation-disabled' });
  state.comments.push({ id: 60, issue_url: 'https://api.github.com/repos/owner/repo/issues/7', user: { login: 'github-actions[bot]', type: 'Bot' }, body: controlResultBody(state.terminal) });
  facts.actions.refine.eligible = false;
  assert.equal((await prepareControlInvocation(options)).state, 'existing'); assert.equal(state.posts.length, 0);
});

test('a lost source claim response cannot lead to native dispatch or an automatic retry', async () => {
  const { options, state } = fixture(); const prepared = await prepareControlInvocation(options), original = options.api;
  options.api = async (path, method, body) => { const response = await original(path, method, body); if (method === 'POST') throw Error('lost response'); return response; };
  await assert.rejects(admitControlInvocation({ ...options, prepared }), /lost response/);
  assert.equal(state.posts.length, 1); assert.equal(state.saved, null);
});
