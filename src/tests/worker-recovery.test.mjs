import test from 'node:test';
import assert from 'node:assert/strict';
import { digest } from '../packages/sdlc/src/host-contract.mjs';
import { dispatchId, dispatchReceiptBody, readDispatchReceipt, loadDispatch, sendDispatch } from '../packages/sdlc/src/stage-dispatch.mjs';
import { recoveryDecision, prepareRecovery, verifyRecoveryOrigin, retryDelayMs, recoveryId, maintenancePath } from '../packages/sdlc/src/worker-recovery.mjs';
import { ownerIssues } from '../packages/sdlc/src/worker-maintenance.mjs';

const repository = 'owner/repo', owner = 'owner', sha = 'a'.repeat(40);
function fixture() {
  const issue = { number: 7, title: 'Task', body: 'Bounded work', state: 'open', user: { login: owner }, labels: [] };
  const request = { schemaVersion: 1, id: dispatchId(repository, '100'), repository, issue: 7, stage: 'implement', routerRunId: '100', routerAttempt: 1, workflowRevision: sha, sourceRevision: sha, ref: 'main', eventName: 'workflow_dispatch', event: { inputs: { issue: '7', stage: 'implement' } }, handoff: false, taskDigest: digest(JSON.stringify({ title: issue.title, body: issue.body, comments: [] })) };
  const actor = { login: owner }, bot = { login: 'github-actions[bot]', type: 'Bot' };
  const parent = { id: 100, run_attempt: 1, path: '.github/workflows/lighthouse-sdlc-router.yml', event: 'workflow_dispatch', actor, triggering_actor: actor, head_sha: sha, head_branch: 'main', repository: { full_name: repository } };
  const maintenance = { ...parent, id: 300, path: maintenancePath, event: 'schedule' };
  const run = { ...parent, id: 200, path: '.github/workflows/lighthouse-sdlc-implement.lock.yml', status: 'completed', conclusion: 'failure', updated_at: new Date(Date.now() - retryDelayMs - 60000).toISOString(), actor: bot, triggering_actor: bot };
  const receipt = { schemaVersion: 1, stage: request.stage, id: request.id, digest: digest(JSON.stringify(request)), routerRunId: '100', routerAttempt: 1, workerRunId: '200', status: 'failed' };
  const comment = { id: 30, user: bot, issue_url: `https://api.github.com/repos/${repository}/issues/7`, body: dispatchReceiptBody(repository, receipt) };
  const jobs = [{ name: 'Authorize and reserve issue', conclusion: 'success' }, { name: 'agent', conclusion: 'failure' }, { name: 'Validate, publish and release', conclusion: 'failure', steps: [{ name: 'Recheck authority and publish the validated result', conclusion: 'skipped' }] }];
  const comments = [comment], calls = [], artifacts = new Map([['100', request]]), runs = new Map([['100', parent], ['200', run], ['300', maintenance]]);
  const api = async (path, method = 'GET', body) => {
    calls.push({ path, method, body });
    if (path === '') return { default_branch: 'main' };
    if (path === 'commits/main') return { sha };
    if (path === 'issues/7') return issue;
    if (path.startsWith('contents/.lighthouse/reconciliation/labels.json?')) return null;
    if (path.startsWith('issues/7/comments?')) return comments;
    if (path === 'issues/7/comments' && method === 'POST') { const next = { ...comment, id: 30 + comments.length, body: body.body }; comments.push(next); return next; }
    if (path.startsWith('issues/comments/')) { const c = comments.find(c => c.id === Number(path.split('/')[2])); if (method === 'PATCH') c.body = body.body; return c; }
    if (path.endsWith('/jobs?per_page=100')) return { total_count: jobs.length, jobs };
    if (path.startsWith('actions/runs/')) return runs.get(path.split('/')[2]);
    if (path.includes('/runs?')) return { total_count: 0, workflow_runs: [] };
    if (path.endsWith('/dispatches')) return null;
    throw Error(`Unexpected ${method} ${path}`);
  };
  const readArtifact = async (_api, _repo, id) => artifacts.get(String(id));
  return { issue, request, parent, maintenance, run, receipt, comment, jobs, comments, calls, api, readArtifact, artifacts, runs };
}
const decide = (f, overrides = {}) => recoveryDecision({ ...f, owner, revision: sha, workflowRevision: sha, ...overrides });

test('recovery separates confirmed safe failure from human decisions, effects and cancellation', () => {
  const f = fixture(); assert.equal(decide(f).state, 'retryable');
  for (const [patch, state] of [
    [{ receipt: { ...f.receipt, status: 'waiting' } }, 'waiting-human'],
    [{ receipt: { ...f.receipt, status: 'blocked' } }, 'blocked'],
    [{ receipt: { ...f.receipt, status: 'completed' }, run: { ...f.run, conclusion: 'success' } }, 'succeeded'],
    [{ run: { ...f.run, status: 'in_progress' } }, 'active'],
    [{ run: { ...f.run, status: 'queued', updated_at: '2020-01-01T00:00:00Z' } }, 'stalled'],
    [{ run: { ...f.run, conclusion: 'cancelled' } }, 'uncertain'],
    [{ run: { ...f.run, run_attempt: 2 } }, 'uncertain'],
    [{ jobs: f.jobs.slice(0, 2) }, 'uncertain'],
    [{ jobs: f.jobs.map(j => j.steps ? { ...j, steps: [{ name: j.steps[0].name, conclusion: 'failure' }] } : j) }, 'uncertain'],
    [{ revision: 'b'.repeat(40) }, 'blocked'],
    [{ workflowRevision: 'b'.repeat(40) }, 'blocked'],
    [{ issue: { ...f.issue, body: 'Changed' } }, 'blocked'],
    [{ issue: { ...f.issue, labels: [{ name: 'agent-working' }] } }, 'blocked'],
    [{ issue: { ...f.issue, labels: [{ name: 'future' }] } }, 'blocked'],
    [{ request: { ...f.request, stage: 'integrate' } }, 'uncertain'],
  ]) assert.equal(decide(f, patch).state, state, JSON.stringify(patch));
});

test('retry delay and finite budget are enforced with an explicit next decision', () => {
  const f = fixture(), ended = Date.parse(f.run.updated_at);
  assert.equal(decide(f, { now: ended + retryDelayMs - 1 }).state, 'delayed');
  assert.equal(decide(f, { now: ended + retryDelayMs }).state, 'retryable');
  const exhausted = decide(f, { request: { ...f.request, recovery: { rootId: f.request.id, attempt: 2 } } });
  assert.equal(exhausted.state, 'exhausted'); assert.match(exhausted.nextAction, /owner decision/);
});

test('maintenance records one retry before sending and never resends a lost response', async () => {
  const f = fixture();
  assert.equal((await prepareRecovery(f.api, repository, owner, 7, f.maintenance, false, Date.now(), f.readArtifact)).request, undefined);
  const result = await prepareRecovery(f.api, repository, owner, 7, f.maintenance, true, Date.now(), f.readArtifact);
  assert.equal(result.request.id, recoveryId(repository, f.request.id, 1));
  assert.equal(result.request.recovery.previousComment, 30);
  assert.equal(f.calls.filter(c => c.path.endsWith('/dispatches')).length, 0);
  await assert.rejects(sendDispatch(async (...args) => { const r = await f.api(...args); if (args[0].endsWith('/dispatches')) throw Error('Response lost'); return r; }, repository, result.request, result.commentId), /Response lost/);
  const repeat = await prepareRecovery(f.api, repository, owner, 7, f.maintenance, true, Date.now(), f.readArtifact);
  assert.equal(repeat.request, undefined); assert.equal(repeat.observations.at(-1).state, 'uncertain');
  assert.equal(f.calls.filter(c => c.path.endsWith('/dispatches')).length, 1);
});

test('retry admission authenticates original authority and rechecks freshness before claiming', async () => {
  const f = fixture();
  const retry = await prepareRecovery(f.api, repository, owner, 7, f.maintenance, true, Date.now(), f.readArtifact);
  f.artifacts.set('300', retry.request);
  const worker = { ...f.run, id: 201 };
  const loaded = await loadDispatch(f.api, repository, owner, 7, retry.commentId, worker, f.readArtifact);
  await verifyRecoveryOrigin(f.api, repository, owner, loaded, f.maintenance, f.readArtifact, 0, true);
  f.issue.body = 'Owner changed the task';
  await assert.rejects(verifyRecoveryOrigin(f.api, repository, owner, loaded, f.maintenance, f.readArtifact, 0, true), /authority-changed/);
  // Historical authentication remains possible after the work item changes.
  await loadDispatch(f.api, repository, owner, 7, retry.commentId, worker, f.readArtifact);
  const altered = { ...retry.request, autoImplement: true };
  f.artifacts.set('300', altered);
  const c = f.comments.at(-1), receipt = readDispatchReceipt(c, repository, 7);
  c.body = dispatchReceiptBody(repository, { ...receipt, digest: digest(JSON.stringify(altered)) });
  await assert.rejects(loadDispatch(f.api, repository, owner, 7, retry.commentId, worker, f.readArtifact), /original authorization/);
});

test('missing original artifacts and spoofed receipts fail closed', async () => {
  const f = fixture(); f.comment.user = { login: 'outsider', type: 'User' };
  await assert.rejects(loadDispatch(f.api, repository, owner, 7, 30, f.run, f.readArtifact), /Untrusted/);
  f.comment.user = { login: 'github-actions[bot]', type: 'Bot' };
  await assert.rejects(prepareRecovery(f.api, repository, owner, 7, f.maintenance, true, Date.now(), async () => { throw Error('Expired artifact'); }), /Expired/);
});

test('a newer request supersedes older failures and two linked retries exhaust the budget', async () => {
  const f = fixture();
  for (let attempt = 1; attempt <= 2; attempt++) {
    const parent = { ...f.maintenance, id: 299 + attempt };
    f.runs.set(String(parent.id), parent);
    const result = await prepareRecovery(f.api, repository, owner, 7, parent, true, Date.now(), f.readArtifact);
    assert.equal(result.request.recovery.attempt, attempt);
    f.artifacts.set(String(parent.id), result.request);
    const run = { ...f.run, id: 200 + attempt };
    f.runs.set(String(run.id), run);
    const comment = f.comments.at(-1), receipt = readDispatchReceipt(comment, repository, 7);
    comment.body = dispatchReceiptBody(repository, { ...receipt, workerRunId: String(run.id), status: 'failed' });
    await loadDispatch(f.api, repository, owner, 7, comment.id, run, f.readArtifact);
  }
  const exhausted = await prepareRecovery(f.api, repository, owner, 7, f.maintenance, true, Date.now(), f.readArtifact);
  assert.equal(exhausted.request, undefined); assert.equal(exhausted.observations.at(-1).state, 'exhausted');
  const current = fixture();
  const fresh = { ...current.request, id: dispatchId(repository, '101'), routerRunId: '101' };
  current.artifacts.set('101', fresh); current.runs.set('101', { ...current.parent, id: 101 });
  current.runs.set('201', { ...current.run, id: 201, conclusion: 'success' });
  current.comments.push({ ...current.comment, id: 31, body: dispatchReceiptBody(repository, { ...current.receipt, id: fresh.id, routerRunId: '101', digest: digest(JSON.stringify(fresh)), workerRunId: '201', status: 'completed' }) });
  assert.equal((await prepareRecovery(current.api, repository, owner, 7, current.maintenance, true, Date.now(), current.readArtifact)).request, undefined);
});

test('maintenance scan selects bounded owner issues and excludes bot reports and PRs', async () => {
  assert.deepEqual(await ownerIssues(async () => [{ number: 1, user: { login: owner } }, { number: 2, user: { login: 'github-actions[bot]' } }, { number: 3, user: { login: owner }, pull_request: {} }], owner), [1]);
  await assert.rejects(ownerIssues(async () => Array.from({ length: 100 }, (_, i) => ({ number: i + 1, user: { login: owner } })), owner), /bounds/);
});

test('maintenance reconciles a missing terminal handoff before any authorized retry', async () => {
  const f = fixture();
  const first = await prepareRecovery(f.api, repository, owner, 7, f.maintenance, false, Date.now(), f.readArtifact);
  assert.equal(first.request, undefined);
  assert.match(f.comments.at(-1).body, /Execution failed · implement/);
  assert.match(f.comments.at(-1).body, /label is not adopted or available/);
  const count = f.comments.length;
  await prepareRecovery(f.api, repository, owner, 7, f.maintenance, false, Date.now(), f.readArtifact);
  assert.equal(f.comments.length, count);
});

test('maintenance reports failed preparation without claiming the agent started', async () => {
  const f = fixture();
  f.jobs[0].conclusion = 'failure';
  f.jobs[1].conclusion = 'skipped';
  await prepareRecovery(f.api, repository, owner, 7, f.maintenance, false, Date.now(), f.readArtifact);
  assert.match(f.comments.at(-1).body, /Preparation failed before the agent started/);
});
