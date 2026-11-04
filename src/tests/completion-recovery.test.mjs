import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcileCompletion } from '../packages/sdlc/src/completion-recovery.mjs';
import { fingerprint } from '../packages/sdlc/src/completion.mjs';
import { digest } from '../packages/sdlc/src/host-contract.mjs';
import { dispatchReceiptBody, dispatchId } from '../packages/sdlc/src/stage-dispatch.mjs';

const repository = 'owner/repo', owner = 'owner', head = 'a'.repeat(40), merge = 'b'.repeat(40);
function fixture() {
  const bot = { login: 'github-actions[bot]', type: 'Bot' };
  const issue = { number: 42, user: { login: owner }, state: 'open', labels: [] };
  const dispatch = { commentId: 10, request: { id: dispatchId(repository, '100', 'integrate'), stage: 'integrate', taskDigest: 'intent' }, receipt: { digest: 'd'.repeat(64) } };
  const run = { id: 200, run_attempt: 1, status: 'completed', conclusion: 'failure' };
  const request = { issue: 42, title: 'Recovery fixture', stage: 'integrate', workflowRunId: '200', attempt: '1', observedAt: '2026-11-04T12:00:00Z', runUrl: 'https://github.com/owner/repo/actions/runs/200', harnessRevision: head,
    runId: fingerprint({ repository, stage: 'integrate', issue: 42, run: '200', attempt: '1' }), taskDigest: 'intent', dispatch: { requestId: dispatch.request.id, digest: dispatch.receipt.digest, commentId: 10 },
    authorization: { issue: 42, pr: 50, head, merge: true }, completion: { binding: { repository, issue: 42, pr: 50, head, base: head, branch: 'main', intent: 'intent', policy: 'policy', reviews: 'reviews', prIntent: 'pr', files: 'files' }, issueUrl: 'https://github.com/owner/repo/issues/42', prUrl: 'https://github.com/owner/repo/pull/50', checks: [{ context: 'verify', status: 'passed', revision: head }] } };
  const receipt = { state: 'merged', sha: merge, acceptedHead: head, authorization: request.authorization, binding: request.completion.binding };
  const envelope = { schemaVersion: 1, result: { schemaVersion: 1, runId: request.runId, stage: 'integrate', gate: 'done', status: 'passed', evidence: [{ id: 'host', status: 'passed' }], missingEvidence: [], unavailableChecks: [], pendingReview: [], nextAction: 'Review the delivered change.' }, effect: { type: 'issue-comment', body: 'Accepted integration.' } };
  const fresh = { ...structuredClone(request.completion), merged: true, merge };
  const dispatchComment = { id: 10, user: bot, issue_url: `https://api.github.com/repos/${repository}/issues/42`, body: dispatchReceiptBody(repository, { schemaVersion: 1, id: dispatch.request.id, digest: dispatch.receipt.digest, stage: 'integrate', routerRunId: '100', routerAttempt: 1, workerRunId: '200', status: 'unknown' }) };
  const comments = [dispatchComment], prComments = [], writes = [], proofs = [];
  let checks = [{ workflow: 'verify.yml', status: 'passed', runId: 250 }], retained = null, publications = 0, loseResponse = false;
  const api = async (path, method = 'GET', body) => {
    if (method !== 'GET') {
      writes.push({ path, method });
      if (method === 'POST' && /^issues\/(42|50)\/comments$/.test(path)) {
        (path.includes('/42/') ? comments : prComments).push({ id: 20 + writes.length, user: bot, body: body.body });
        if (loseResponse) { loseResponse = false; throw Error('lost handoff response'); }
        return {};
      }
      if (path === 'issues/comments/10' && method === 'PATCH') { dispatchComment.body = body.body; return {}; }
      throw Error(`Unexpected effect ${method} ${path}`);
    }
    if (path === 'issues/42') return issue;
    if (path.startsWith('issues/42/comments?')) return comments;
    if (path.startsWith('issues/50/comments?')) return prComments;
    if (path === 'issues/comments/10') return dispatchComment;
    throw Error(path);
  };
  const options = {
    readArtifact: async (_api, _repo, _run, _artifact, name) => ({ 'request.json': request, 'envelope.json': envelope, 'integration-receipt.json': receipt })[name],
    inspect: async () => fresh, postMerge: async () => checks, readIntegration: async () => retained,
    save: async value => proofs.push(value),
    readPublication: async () => ({ commit: head, url: 'https://github.com/owner/repo/blob/evidence/report.md' }),
    publish: async (_api, _request, files, beforeWrite) => { await beforeWrite(); publications++; retained = { workflow: { conclusion: 'failure', recovery: { runId: '300' } }, commit: head, url: 'https://github.com/owner/repo/blob/evidence/report.md', recordSha256: digest(files['evidence-record.json']), receipt: JSON.parse(files['receipt.json']) }; return { commit: head, url: retained.url }; },
  };
  const observation = { dispatch, run, jobs: [{ name: 'agent', conclusion: 'success' }] };
  const call = (enabled = true) => reconcileCompletion(api, repository, owner, issue, observation, { id: 300, run_attempt: 1, head_sha: head }, enabled, options);
  return { request, receipt, envelope, fresh, issue, run, observation, comments, prComments, writes, proofs, call, publications: () => publications, setChecks: value => { checks = value; }, loseHandoffResponse: () => { loseResponse = true; } };
}

test('confirmed merge recovery publishes once and resumes existing CI in either receipt order', async () => {
  const f = fixture();
  f.setChecks([{ workflow: 'verify.yml', status: 'pending' }]);
  assert.equal((await f.call()).code, 'post-merge-ci-pending');
  assert.equal(f.writes.length, 0);
  f.setChecks([{ workflow: 'verify.yml', status: 'passed', runId: 250 }]);
  assert.equal((await f.call(false)).code, 'completion-recovery-disabled');
  assert.equal(f.writes.length, 0);
  assert.equal((await f.call()).review.ciRun, 250);
  assert.equal((await f.call()).code, 'completion-restored');
  assert.equal(f.publications(), 1);
  assert.equal(f.comments.length, 2);
  assert.equal(f.prComments.length, 1);
  assert.equal(f.proofs.length, 2);
  assert.equal(f.writes.some(write => /merge|dispatches|git\//.test(write.path)), false);
});

test('lost handoff response is reconciled from the actual comment without republishing or repeating effects', async () => {
  const f = fixture();
  f.loseHandoffResponse();
  await assert.rejects(f.call(), /lost handoff response/);
  assert.equal(f.publications(), 1);
  assert.equal((await f.call()).code, 'completion-restored');
  assert.equal(f.publications(), 1);
  assert.equal(f.comments.length, 2);
  assert.equal(f.prComments.length, 1);
});

test('uncertain merge, cancellation, changed authority and newer dispatch cannot recover publication', async () => {
  for (const mode of ['receipt', 'head', 'intent', 'policy', 'reviews', 'cancelled', 'agent', 'hold', 'superseded']) {
    const f = fixture();
    if (mode === 'receipt') f.receipt.state = 'unknown';
    if (['head', 'intent', 'policy', 'reviews'].includes(mode)) f.fresh.binding[mode] = 'changed';
    if (mode === 'cancelled') f.run.conclusion = 'cancelled';
    if (mode === 'agent') f.observation.jobs[0].conclusion = 'failure';
    if (mode === 'hold') f.issue.labels = [{ name: 'human-working' }];
    if (mode === 'superseded') f.comments.push({ id: 99, user: { login: 'github-actions[bot]' }, body: '<!-- lighthouse-dispatch:...' });
    if (mode === 'superseded') await assert.rejects(f.call(), /superseded/);
    else assert.notEqual((await f.call())?.code, 'completion-restored', mode);
    assert.equal(f.publications(), 0, mode);
    assert.equal(f.writes.length, 0, mode);
  }
});


test('a confirmed blocked report restores only its handoff after a lost response', async () => {
  const f = fixture();
  f.envelope.result.status = 'blocked'; f.receipt.state = 'blocked'; f.fresh.merged = false;
  f.loseHandoffResponse();
  await assert.rejects(f.call(), /lost handoff response/);
  assert.equal((await f.call()).code, 'blocked-handoff-restored');
  assert.equal(f.comments.length, 2); assert.equal(f.prComments.length, 1);
  assert.equal(f.publications(), 0); assert.equal(f.proofs.length, 0);
  assert.equal(f.writes.some(write => /merge|dispatches|git\//.test(write.path)), false);
});

test('a claimed recovery event cannot replace native review authority with caller-supplied authorization', async () => {
  const { authorizeCompletionEvent } = await import('../packages/sdlc/src/completion.mjs');
  const event = { action: 'completed', completionRecovery: { maintenance: 300, issue: 42 }, completionAuthorization: { issue: 42, pr: 50, head, merge: true } };
  const env = { GITHUB_EVENT_NAME: 'workflow_run', GITHUB_REPOSITORY_OWNER: owner };
  await assert.rejects(authorizeCompletionEvent(async () => ({}), repository, event, env, 'integrate'), /review only/);
  await assert.rejects(authorizeCompletionEvent(async () => ({ id: 300, path: '.github/workflows/lighthouse-worker-maintenance.yml', repository: { full_name: repository }, status: 'completed', conclusion: 'success', actor: { login: 'other' } }), repository, event, env, 'review'), /owner maintenance origin/);
});
