import test from 'node:test';
import assert from 'node:assert/strict';
import { pendingReviewMarker, completionSummary } from '../packages/sdlc/src/completion-status.mjs';
import { reconcilePostMergeReviews } from '../packages/sdlc/src/post-merge-review.mjs';

const repository = 'owner/repo', head = 'a'.repeat(40), merge = 'b'.repeat(40);
const request = { stage: 'integrate', issue: 18, workflowRunId: '40', attempt: '1', authorization: { pr: 7, head }, completion: { binding: { repository } } };
const receipt = { state: 'merged', sha: merge, postMerge: [{ workflow: 'ci.yml', state: 'passed', status: 'passed', runId: 50 }] };
function fixture() {
  const issue = { number: 18, state: 'open', user: { login: 'owner' }, labels: [] };
  const comments = [{ id: 1, user: { login: 'github-actions[bot]', type: 'Bot' }, issue_url: `https://api.github.com/repos/${repository}/issues/18`, body: pendingReviewMarker(request, receipt) }];
  const current = { merged: true, merge, binding: { head }, labels: [] };
  const integration = { workflow: { runId: '40', attempt: '1' }, receipt: { sha: merge } };
  const checks = structuredClone(receipt.postMerge), writes = [], reads = [];
  const api = async (path, method = 'GET', body) => {
    if (method !== 'GET') { writes.push({ path, body }); return; }
    reads.push(path);
    if (path.startsWith('issues?')) return [issue];
    if (path.startsWith('issues/18/comments?')) return comments;
    if (path === 'issues/18') return issue;
    throw Error(`Unexpected API ${path}`);
  };
  const services = { inspect: async () => current, readIntegration: async () => integration, postMerge: async () => checks };
  const reconcile = () => reconcilePostMergeReviews(api, repository, 'owner', 'main', services);
  return { api, issue, comments, current, integration, checks, writes, reads, services, reconcile };
}

test('confirmed status describes observed merge and CI rather than repeating a pre-effect assessment', () => {
  const text = completionSummary(request, receipt);
  assert.match(text, new RegExp(merge));
  assert.match(text, /ci.yml: passed/);
  assert.match(text, /Final review: pending/);
  for (const state of ['prepared', 'blocked', 'unknown']) assert.doesNotMatch(completionSummary(request, { state, sha: merge }), /Merge confirmed/);
  assert.equal(pendingReviewMarker(request, { state: 'unknown', sha: merge }), '');
});

test('early CI retains the original integration intent until its evidence authenticates', async () => {
  const f = fixture(); let visible = false;
  f.services.readIntegration = async () => { if (!visible) throw Error('Original integration is still finishing'); return f.integration; };
  assert.equal((await f.reconcile())[0].state, 'pending');
  assert.equal(f.writes.length, 0);
  assert.match(f.comments[0].body, /lighthouse-pending-review/);
  visible = true;
  assert.equal((await f.reconcile())[0].state, 'signalled');
  assert.deepEqual(f.writes, [{ path: 'actions/workflows/lighthouse-sdlc-router.yml/dispatches', body: { ref: 'main', inputs: { issue: '18', stage: 'review', workflow: 'stage', after_run: '50' } } }]);
});

test('late CI and temporarily missing provider observations remain pending without repeating any effect', async () => {
  const f = fixture(); f.checks[0].status = 'unavailable'; f.checks[0].state = 'pending';
  assert.equal((await f.reconcile())[0].state, 'pending');
  f.services.inspect = async () => { throw Error('PR temporarily unavailable'); };
  assert.equal((await f.reconcile())[0].state, 'pending');
  f.services.inspect = async () => f.current; f.checks[0].status = 'passed';
  assert.equal((await f.reconcile())[0].state, 'signalled');
  assert.equal(f.writes.length, 1);
});

test('an existing final-review receipt, including a lost admission acknowledgement, is never resent', async () => {
  const { dispatchId } = await import('../packages/sdlc/src/stage-dispatch.mjs');
  for (const workerRunId of [null, '60']) {
    const f = fixture();
    f.comments.push({ id: 2, issue_url: f.comments[0].issue_url, user: f.comments[0].user, body: `<!-- lighthouse-dispatch:${JSON.stringify({ schemaVersion: 1, stage: 'review', id: dispatchId(repository, '50', 'review'), digest: 'c'.repeat(64), routerRunId: '51', routerAttempt: '1', eventRunId: '50', workerRunId })} -->` });
    assert.equal((await f.reconcile())[0].state, workerRunId ? 'recorded' : 'uncertain');
    assert.equal(f.writes.length, 0);
  }
});

test('untrusted hints, owner holds, changed heads or a different original integration never grant review', async () => {
  for (const change of [f => { f.comments[0].user = { login: 'outsider', type: 'User' }; }, f => { f.issue.labels = [{ name: 'human-working' }]; }, f => { f.issue.state = 'closed'; }, f => { f.current.binding.head = 'd'.repeat(40); }, f => { f.current.merge = 'd'.repeat(40); }, f => { f.integration.workflow.runId = '41'; }, f => { f.integration = null; f.services.readIntegration = async () => null; }]) {
    const f = fixture(); change(f); await f.reconcile(); assert.equal(f.writes.length, 0);
  }
});

test('a lost router acknowledgement may retry only the original CI signal; a recorded worker is still single-use', async () => {
  const f = fixture();
  let lost = true;
  const api = async (...args) => {
    const result = await f.api(...args);
    if (args[1] === 'POST' && lost) { lost = false; throw Error('Response lost after router accepted the signal'); }
    return result;
  };
  const reconcile = () => reconcilePostMergeReviews(api, repository, 'owner', 'main', f.services);
  assert.equal((await reconcile())[0].state, 'signal-unconfirmed');
  assert.equal((await reconcile())[0].state, 'signalled');
  assert.equal(f.writes.length, 2);
  assert.deepEqual(f.writes[0], f.writes[1]);
  assert.equal(f.writes.every(write => write.path.endsWith('router.yml/dispatches')), true);
});

test('duplicate scheduled and native signals consume one original-CI worker request', async () => {
  const { dispatchId, recordDispatch, sendDispatch } = await import('../packages/sdlc/src/stage-dispatch.mjs');
  const f = fixture();
  const api = async (path, method = 'GET', body) => {
    if (path === 'issues/18/comments' && method === 'POST') {
      const comment = { ...f.comments[0], id: 2, body: body.body }; f.comments.push(comment); return comment;
    }
    if (path === 'issues/comments/2') return f.comments[1];
    return f.api(path, method, body);
  };
  await reconcilePostMergeReviews(api, repository, 'owner', 'main', f.services);
  const signal = f.writes[0].body.inputs;
  const request = { repository, issue: 18, stage: 'review', id: dispatchId(repository, signal.after_run, 'review'), eventRunId: signal.after_run, routerRunId: '51', routerAttempt: '1', ref: 'main' };
  for (let i = 0; i < 2; i++) {
    const recorded = await recordDispatch(api, repository, request);
    if (recorded.send) await sendDispatch(api, repository, request, recorded.comment.id);
  }
  assert.equal((await reconcilePostMergeReviews(api, repository, 'owner', 'main', f.services))[0].state, 'uncertain');
  assert.equal(f.writes.filter(write => write.path.endsWith('review.lock.yml/dispatches')).length, 1);
});

test('holds and changed observations between inspection and signal prevent publication', async () => {
  const f = fixture(); let observations = 0;
  f.services.inspect = async () => { if (++observations === 2) f.current.merge = 'd'.repeat(40); return f.current; };
  assert.equal((await f.reconcile())[0].state, 'pending');
  assert.equal(f.writes.length, 0);
  const g = fixture();
  const api = async (...args) => { if (args[0] === 'issues/18') g.issue.labels = [{ name: 'future' }]; return g.api(...args); };
  assert.equal((await reconcilePostMergeReviews(api, repository, 'owner', 'main', g.services))[0].state, 'superseded');
  assert.equal(g.writes.length, 0);
});

test('incomplete issue inventory fails explicitly before signalling any continuation', async () => {
  const f = fixture();
  const api = async (...args) => args[0].startsWith('issues?') ? Array.from({ length: 100 }, () => f.issue) : f.api(...args);
  await assert.rejects(reconcilePostMergeReviews(api, repository, 'owner', 'main', f.services), /exceeds/);
  assert.equal(f.writes.length, 0);
});
