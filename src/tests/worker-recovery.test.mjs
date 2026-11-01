import test from 'node:test';
import assert from 'node:assert/strict';
import { digest } from '../packages/sdlc/src/host-contract.mjs';
import { dispatchId, dispatchReceiptBody, readDispatchReceipt, loadDispatch, sendDispatch } from '../packages/sdlc/src/stage-dispatch.mjs';
import { recoveryDecision, prepareRecovery, reconcileUnattendedStop, verifyRecoveryOrigin, retryDelayMs, recoveryId, maintenancePath } from '../packages/sdlc/src/worker-recovery.mjs';
import { ownerIssues } from '../packages/sdlc/src/worker-maintenance.mjs';
import { reportProductApplyStop } from '../packages/sdlc/src/issue-actions.mjs';

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

test('maintenance reports an interrupted unattended run without releasing its reservation or duplicating the handoff', async () => {
  const f = fixture(), runId = '402', route = 'ff';
  const marker = digest(JSON.stringify({ repository, issue: 7, route, run: runId }));
  f.issue.labels = [{ name: 'agent-working' }];
  f.comments.splice(0, f.comments.length, { id: 40, user: { login: 'github-actions[bot]', type: 'Bot' }, body: `## Working · ff\n\n[Execution](https://github.com/${repository}/actions/runs/${runId}).\n\n<!-- lighthouse-unattended:${marker} -->` });
  f.runs.set(runId, { ...f.parent, id: Number(runId), path: '.github/workflows/lighthouse-sdlc-unattended.yml', display_title: 'ff #7 · owner', status: 'completed', conclusion: 'cancelled' });
  assert.equal(await reconcileUnattendedStop(f.api, repository, owner, f.issue, f.comments), 'restored');
  assert.match(f.comments.at(-1).body, /terminal handoff is missing/);
  assert.match(f.comments.at(-1).body, /reservation remains/);
  assert.equal(f.issue.labels[0].name, 'agent-working');
  assert.equal(await reconcileUnattendedStop(f.api, repository, owner, f.issue, f.comments), 'not-applicable');
  assert.equal(f.calls.filter(c => c.path === 'issues/7/comments' && c.method === 'POST').length, 1);
});

test('unattended recovery rejects spoofed or superseded attempts', async () => {
  const f = fixture(), runId = '402', route = 'ff';
  const marker = digest(JSON.stringify({ repository, issue: 7, route, run: runId }));
  f.comments.splice(0, f.comments.length, { id: 40, user: { login: 'github-actions[bot]', type: 'Bot' }, body: `## Working · ff\n\n[Execution](https://github.com/${repository}/actions/runs/${runId}).\n\n<!-- lighthouse-unattended:${marker} -->` });
  const run = { ...f.parent, id: Number(runId), path: '.github/workflows/lighthouse-sdlc-unattended.yml', display_title: 'ff #7 · owner', status: 'completed', conclusion: 'failure' };
  f.runs.set(runId, { ...run, actor: { login: 'attacker' } });
  assert.equal(await reconcileUnattendedStop(f.api, repository, owner, f.issue, f.comments), 'uncertain');
  f.runs.set(runId, run);
  const snapshot = [...f.comments];
  f.comments.push({ id: 41, user: { login: 'github-actions[bot]', type: 'Bot' }, body: '<!-- lighthouse-dispatch:new -->' });
  assert.equal(await reconcileUnattendedStop(f.api, repository, owner, f.issue, snapshot), 'uncertain');
  assert.equal(f.calls.filter(c => c.path === 'issues/7/comments' && c.method === 'POST').length, 0);
});

test('a newer unattended attempt prevents retrying an older failed worker', async () => {
  const f = fixture(), runId = '402', route = 'ff';
  const marker = digest(JSON.stringify({ repository, issue: 7, route, run: runId }));
  f.comments.push({ id: 40, user: { login: 'github-actions[bot]', type: 'Bot' }, body: `## Working · ff\n\n[Execution](https://github.com/${repository}/actions/runs/${runId}).\n\n<!-- lighthouse-unattended:${marker} -->` });
  f.runs.set(runId, { ...f.parent, id: Number(runId), path: '.github/workflows/lighthouse-sdlc-unattended.yml', display_title: 'ff #7 · owner', status: 'completed', conclusion: 'failure' });
  const result = await prepareRecovery(f.api, repository, owner, 7, f.maintenance, true, Date.now(), f.readArtifact);
  assert.equal(result.request, undefined);
  assert.deepEqual(result.observations, []);
  assert.equal(f.comments.filter(c => c.body.includes('<!-- lighthouse-dispatch:')).length, 1);
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

test('maintenance restores a missing authenticated refinement handoff only while its state remains current', async () => {
  const f = fixture();
  f.request.stage = 'refine'; f.request.id = dispatchId(repository, '100', 'refine');
  f.run.path = '.github/workflows/lighthouse-sdlc-refine.lock.yml'; f.run.conclusion = 'success';
  f.jobs[1].conclusion = 'success'; f.jobs[2].conclusion = 'success'; f.jobs[2].steps[0].conclusion = 'success';
  f.issue.labels = [{ name: 'ready' }];
  const receipt = { ...f.receipt, stage: 'refine', id: f.request.id, digest: digest(JSON.stringify(f.request)), status: 'completed' };
  f.comment.body = dispatchReceiptBody(repository, receipt);
  const snapshot = { runId: digest(`${repository}:7:refine:200:1`), issue: 7, stage: 'refine', workflowRunId: '200', workflowRevision: sha, sourceRevision: sha, taskDigest: f.request.taskDigest, autoImplement: false, dispatch: { commentId: 30, requestId: f.request.id, digest: receipt.digest } };
  const envelope = { schemaVersion: 1, result: { schemaVersion: 1, runId: snapshot.runId, stage: 'refine', gate: 'ready', status: 'passed', evidence: [], missingEvidence: [], unavailableChecks: [], pendingReview: [], nextAction: 'Owner: review.' }, effect: { type: 'issue-comment', body: 'The refinement is complete.' } };
  const readArtifact = async (...args) => args[4] === 'request.json' ? snapshot : args[4] === 'envelope.json' ? envelope : f.readArtifact(...args);
  await prepareRecovery(f.api, repository, owner, 7, f.maintenance, false, Date.now(), readArtifact);
  assert.match(f.comments.at(-1).body, /Stage completed · refine/);
  assert.match(f.comments.at(-1).body, /Owner: review the refinement/);
  const count = f.comments.length;
  await prepareRecovery(f.api, repository, owner, 7, f.maintenance, false, Date.now(), readArtifact);
  assert.equal(f.comments.length, count);
  f.comments.pop();
  receipt.status = 'waiting'; f.comment.body = dispatchReceiptBody(repository, receipt);
  envelope.result.status = 'blocked'; envelope.result.output = { handoff: { question: 'May the fixture be used?' } };
  envelope.effect.body = 'The refinement needs an answer.';
  f.issue.labels = [{ name: 'needs-info' }];
  await prepareRecovery(f.api, repository, owner, 7, f.maintenance, false, Date.now(), readArtifact);
  assert.match(f.comments.at(-1).body, /Owner: May the fixture be used\? Reply here/);
  f.comments.pop(); f.issue.labels = [];
  const changed = await prepareRecovery(f.api, repository, owner, 7, f.maintenance, false, Date.now(), readArtifact);
  assert.equal(f.comments.length, 1);
  assert.equal(changed.observations[0].code, 'handoff-unconfirmed');
});

test('maintenance reports failed preparation without claiming the agent started', async () => {
  const f = fixture();
  f.jobs[0].conclusion = 'failure';
  f.jobs[1].conclusion = 'skipped';
  await prepareRecovery(f.api, repository, owner, 7, f.maintenance, false, Date.now(), f.readArtifact);
  assert.match(f.comments.at(-1).body, /Preparation failed before the agent started/);
});

test('maintenance distinguishes timeouts and cancellation before and during publication', async () => {
  for (const scenario of ['agent-timeout', 'activation-timeout', 'pre-agent-cancelled', 'publication-cancelled']) {
    const f = fixture();
    if (scenario === 'agent-timeout') f.jobs[1].conclusion = 'timed_out';
    if (scenario === 'activation-timeout') { f.jobs.splice(1, 0, { name: 'activation', conclusion: 'timed_out' }); f.jobs[2].conclusion = 'skipped'; }
    if (scenario === 'pre-agent-cancelled') { f.run.conclusion = 'cancelled'; f.jobs[1].conclusion = 'skipped'; }
    if (scenario === 'publication-cancelled') { f.run.conclusion = 'cancelled'; f.jobs[1].conclusion = 'success'; f.jobs[2].steps[0].conclusion = 'cancelled'; }
    await prepareRecovery(f.api, repository, owner, 7, f.maintenance, false, Date.now(), f.readArtifact);
    const body = f.comments.at(-1).body;
    if (scenario === 'agent-timeout') assert.match(body, /agent execution failed/);
    if (scenario === 'activation-timeout') assert.match(body, /environment failed before the agent started/);
    if (scenario === 'pre-agent-cancelled') assert.match(body, /cancelled before the agent started/);
    if (scenario === 'publication-cancelled') assert.match(body, /effects and final result are not confirmed/);
  }
});

test('maintenance retains an authenticated issue answer in the recovered failure notice', async () => {
  const f = fixture();
  f.request.eventName = 'issue_comment';
  f.request.event = { action: 'created', issue: { number: 7 }, comment: { body: 'Yes', user: { login: owner, type: 'User' } } };
  f.parent.event = 'issue_comment';
  f.comment.body = dispatchReceiptBody(repository, { ...f.receipt, digest: digest(JSON.stringify(f.request)) });
  await prepareRecovery(f.api, repository, owner, 7, f.maintenance, false, Date.now(), f.readArtifact);
  assert.match(f.comments.at(-1).body, /recorded answer remains available/);
});

test('maintenance reports uncertain publication without retrying or duplicating the notice', async () => {
  const f = fixture();
  f.jobs[1].conclusion = 'success';
  f.jobs[2].steps[0].conclusion = 'failure';
  const first = await prepareRecovery(f.api, repository, owner, 7, f.maintenance, true, Date.now(), f.readArtifact);
  assert.equal(first.request, undefined);
  assert.match(f.comments.at(-1).body, /effects and final result are not confirmed/);
  const count = f.comments.length;
  await prepareRecovery(f.api, repository, owner, 7, f.maintenance, true, Date.now(), f.readArtifact);
  assert.equal(f.comments.length, count);
});

test('maintenance records only a uniquely authenticated pre-admission failure without retrying', async () => {
  for (const mode of ['safe', 'receipt-interrupted', 'agent-started', 'jobs-incomplete', 'active', 'ambiguous', 'reserved', 'paused']) {
    const f = fixture();
    f.request.stage = 'refine'; f.request.id = dispatchId(repository, '100', 'refine');
    f.run.path = '.github/workflows/lighthouse-sdlc-refine.lock.yml';
    if (mode === 'active') f.run.status = 'in_progress';
    f.comment.body = dispatchReceiptBody(repository, { ...f.receipt, stage: 'refine', id: f.request.id, digest: digest(JSON.stringify(f.request)), status: 'requested', workerRunId: null });
    f.jobs.splice(0, f.jobs.length, { name: 'Authorize and reserve issue', conclusion: 'failure' }, { name: 'agent', conclusion: mode === 'agent-started' ? 'success' : 'skipped' }, { name: 'Validate, publish and release', conclusion: 'skipped' });
    if (mode === 'reserved') f.issue.labels = [{ name: 'agent-working' }];
    if (mode === 'paused') f.issue.labels = [{ name: 'future' }];
    let patches = 0;
    const api = async (path, method, body) => {
      if (path.includes('/runs?event=workflow_dispatch')) return { total_count: mode === 'ambiguous' ? 101 : 1, workflow_runs: [{ id: 200, display_title: 'refine #7 · request 30' }] };
      if (mode === 'jobs-incomplete' && path.endsWith('/jobs?per_page=100')) return { total_count: 4, jobs: f.jobs };
      if (mode === 'receipt-interrupted' && path === 'issues/comments/30' && method === 'PATCH' && ++patches === 2) throw Error('receipt update interrupted');
      return f.api(path, method, body);
    };
    if (mode === 'receipt-interrupted') await assert.rejects(prepareRecovery(api, repository, owner, 7, f.maintenance, true, Date.now(), f.readArtifact), /receipt update interrupted/);
    const result = await prepareRecovery(api, repository, owner, 7, f.maintenance, true, Date.now(), f.readArtifact);
    const receipt = readDispatchReceipt(f.comment, repository, 7);
    assert.equal(result.request, undefined);
    assert.equal(f.calls.some(call => call.path.endsWith('/dispatches')), false);
    if (mode === 'safe' || mode === 'receipt-interrupted') {
      assert.equal(receipt.workerRunId, '200');
      assert.equal(receipt.status, 'failed');
      assert.equal(result.observations[0].code, 'preparation-failed');
      assert.match(f.comments.at(-1).body, /Preparation failed before the agent started/);
      const count = f.comments.length;
      await prepareRecovery(api, repository, owner, 7, f.maintenance, true, Date.now(), f.readArtifact);
      assert.equal(f.comments.length, count);
    } else {
      assert.equal(receipt.workerRunId, null, mode);
      assert.equal(result.observations[0].code, 'dispatch-unconfirmed', mode);
    }
  }
});

test('maintenance reports failed product apply without authorizing a retry', async () => {
  const f = fixture();
  f.request.stage = 'propose'; f.request.worker = 'apply-product-change';
  f.request.id = dispatchId(repository, '100', 'propose');
  f.request.productApproval = { kind: 'approval', reviewKey: 'b'.repeat(64) };
  f.run.path = '.github/workflows/lighthouse-sdlc-apply-product-change.lock.yml';
  f.jobs.splice(0, f.jobs.length, { name: 'Recheck product approval', conclusion: 'success' }, { name: 'Apply with the pinned ProductShape provider', conclusion: 'failure' }, { name: 'Recheck and publish provider output', conclusion: 'failure' });
  f.comment.body = dispatchReceiptBody(repository, { ...f.receipt, stage: 'propose', worker: 'apply-product-change', id: f.request.id, digest: digest(JSON.stringify(f.request)) });
  const result = await prepareRecovery(f.api, repository, owner, 7, f.maintenance, true, Date.now(), f.readArtifact);
  assert.equal(result.request, undefined);
  assert.match(f.comments.at(-1).body, /Product Change provider failed before publication/);
  assert.doesNotMatch(f.comments.at(-1).body, /agent execution failed/);
});

test('product apply finalizer authenticates and deduplicates its failure handoff', async () => {
  const f = fixture();
  f.request.stage = 'propose'; f.request.worker = 'apply-product-change';
  f.request.id = dispatchId(repository, '100', 'propose');
  f.request.productApproval = { kind: 'approval', reviewKey: 'b'.repeat(64), pullRequest: 8, head: sha };
  f.run.path = '.github/workflows/lighthouse-sdlc-apply-product-change.lock.yml';
  f.comment.body = dispatchReceiptBody(repository, { ...f.receipt, stage: 'propose', worker: 'apply-product-change', id: f.request.id, digest: digest(JSON.stringify(f.request)), status: 'running' });
  const env = { LIGHTHOUSE_ISSUE: '7', GITHUB_RUN_ID: '200', GITHUB_RUN_ATTEMPT: '1', LIGHTHOUSE_PREPARE_RESULT: 'success', LIGHTHOUSE_APPLY_RESULT: 'failure', LIGHTHOUSE_PUBLISH_RESULT: 'failure' };
  const event = { inputs: { 'dispatch-request': '30' } };
  const prComments = [];
  const api = async (path, method = 'GET', body) => {
    if (path === 'pulls/8') return { state: 'open', head: { sha, repo: { full_name: repository } }, base: { repo: { full_name: repository } } };
    if (path.startsWith('issues/8/comments?')) return prComments;
    if (path === 'issues/8/comments' && method === 'POST') { prComments.push({ user: { login: 'github-actions[bot]', type: 'Bot' }, body: body.body }); return; }
    return f.api(path, method, body);
  };
  await reportProductApplyStop(api, repository, owner, env, event, f.readArtifact);
  assert.equal(readDispatchReceipt(f.comment, repository, 7).status, 'failed');
  assert.match(f.comments.at(-1).body, /Product Change provider failed before publication/);
  assert.match(prComments[0].body, /approved Product Change apply did not complete/);
  const count = f.comments.length;
  await reportProductApplyStop(api, repository, owner, env, event, f.readArtifact);
  assert.equal(f.comments.length, count);
  assert.equal(prComments.length, 1);
});

test('product apply finalizer records an authenticated pre-claim failure without retrying', async () => {
  const f = fixture();
  f.request.stage = 'propose'; f.request.worker = 'apply-product-change';
  f.request.id = dispatchId(repository, '100', 'propose');
  f.request.productApproval = { kind: 'approval', reviewKey: 'b'.repeat(64) };
  f.run.path = '.github/workflows/lighthouse-sdlc-apply-product-change.lock.yml';
  f.comment.body = dispatchReceiptBody(repository, { ...f.receipt, stage: 'propose', worker: 'apply-product-change', id: f.request.id, digest: digest(JSON.stringify(f.request)), status: 'requested', workerRunId: null });
  const env = { LIGHTHOUSE_ISSUE: '7', GITHUB_RUN_ID: '200', GITHUB_RUN_ATTEMPT: '1', LIGHTHOUSE_PREPARE_RESULT: 'failure', LIGHTHOUSE_APPLY_RESULT: 'skipped', LIGHTHOUSE_PUBLISH_RESULT: 'skipped' };
  const event = { inputs: { 'dispatch-request': '30' } };
  await reportProductApplyStop(f.api, repository, owner, env, event, f.readArtifact);
  const receipt = readDispatchReceipt(f.comment, repository, 7);
  assert.equal(receipt.workerRunId, '200');
  assert.equal(receipt.status, 'failed');
  assert.match(f.comments.at(-1).body, /Product Change preparation failed before the provider started/);
  const count = f.comments.length;
  await reportProductApplyStop(f.api, repository, owner, env, event, f.readArtifact);
  assert.equal(f.comments.length, count);
});

test('maintenance restores a failed read-only publication after its label was written', async () => {
  const f = fixture();
  f.request.stage = 'refine'; f.request.id = dispatchId(repository, '100', 'refine');
  f.run.path = '.github/workflows/lighthouse-sdlc-refine.lock.yml';
  f.jobs[1].conclusion = 'success'; f.jobs[2].steps[0].conclusion = 'failure';
  f.issue.labels = [{ name: 'ready' }];
  const receipt = { ...f.receipt, stage: 'refine', id: f.request.id, digest: digest(JSON.stringify(f.request)), status: 'unknown' };
  f.comment.body = dispatchReceiptBody(repository, receipt);
  const snapshot = { runId: digest(`${repository}:7:refine:200:1`), issue: 7, stage: 'refine', workflowRunId: '200', workflowRevision: sha, sourceRevision: sha, taskDigest: f.request.taskDigest, autoImplement: false, dispatch: { commentId: 30, requestId: f.request.id, digest: receipt.digest } };
  const envelope = { schemaVersion: 1, result: { schemaVersion: 1, runId: snapshot.runId, stage: 'refine', gate: 'ready', status: 'passed', evidence: [], missingEvidence: [], unavailableChecks: [], pendingReview: [], nextAction: 'Owner: review.' }, effect: { type: 'issue-comment', body: 'The refinement is complete.' } };
  const readArtifact = async (...args) => args[4] === 'request.json' ? snapshot : args[4] === 'envelope.json' ? envelope : f.readArtifact(...args);
  const first = await prepareRecovery(f.api, repository, owner, 7, f.maintenance, true, Date.now(), readArtifact);
  assert.equal(first.request, undefined);
  assert.match(f.comments.at(-1).body, /previous handoff was restored/);
  assert.equal(readDispatchReceipt(f.comment, repository, 7).status, 'completed');
  assert.equal(f.calls.some(c => c.path.endsWith('/dispatches')), false);
  const count = f.comments.length;
  await prepareRecovery(f.api, repository, owner, 7, f.maintenance, true, Date.now(), readArtifact);
  assert.equal(f.comments.length, count);
});

test('maintenance restores a failed read-only publication for a question without claiming completion', async () => {
  const f = fixture();
  f.request.stage = 'refine'; f.request.id = dispatchId(repository, '100', 'refine');
  f.run.path = '.github/workflows/lighthouse-sdlc-refine.lock.yml';
  f.jobs[1].conclusion = 'success'; f.jobs[2].steps[0].conclusion = 'failure';
  f.issue.labels = [{ name: 'needs-info' }];
  const receipt = { ...f.receipt, stage: 'refine', id: f.request.id, digest: digest(JSON.stringify(f.request)), status: 'unknown' };
  f.comment.body = dispatchReceiptBody(repository, receipt);
  const snapshot = { runId: digest(`${repository}:7:refine:200:1`), issue: 7, stage: 'refine', workflowRunId: '200', workflowRevision: sha, sourceRevision: sha, taskDigest: f.request.taskDigest, autoImplement: false, dispatch: { commentId: 30, requestId: f.request.id, digest: receipt.digest } };
  const envelope = { schemaVersion: 1, result: { schemaVersion: 1, runId: snapshot.runId, stage: 'refine', gate: 'ready', status: 'blocked', output: { handoff: { question: 'May this continue?' } }, evidence: [], missingEvidence: [], unavailableChecks: [], pendingReview: [], nextAction: 'Owner: review.' }, effect: { type: 'issue-comment', body: 'The refinement is complete.' } };
  const readArtifact = async (...args) => args[4] === 'request.json' ? snapshot : args[4] === 'envelope.json' ? envelope : f.readArtifact(...args);
  const first = await prepareRecovery(f.api, repository, owner, 7, f.maintenance, true, Date.now(), readArtifact);
  assert.equal(first.request, undefined);
  assert.match(f.comments.at(-1).body, /May this continue/);
  assert.equal(readDispatchReceipt(f.comment, repository, 7).status, 'waiting');
  assert.equal(f.calls.some(c => c.path.endsWith('/dispatches')), false);
  const count = f.comments.length;
  await prepareRecovery(f.api, repository, owner, 7, f.maintenance, true, Date.now(), readArtifact);
  assert.equal(f.comments.length, count);
});

test('maintenance completes an interrupted read-only label transition before publishing its handoff', async () => {
  for (const alreadyWritten of [false, true, 'competing']) {
    const f = fixture();
    f.request.stage = 'refine'; f.request.id = dispatchId(repository, '100', 'refine');
    f.run.path = '.github/workflows/lighthouse-sdlc-refine.lock.yml';
    f.jobs[1].conclusion = 'success'; f.jobs[2].steps[0].conclusion = 'failure';
    f.issue.labels = [{ name: 'refine' }, ...(alreadyWritten === true ? [{ name: 'ready' }] : []), ...(alreadyWritten === 'competing' ? [{ name: 'implement' }] : [])];
    const receipt = { ...f.receipt, stage: 'refine', id: f.request.id, digest: digest(JSON.stringify(f.request)), status: 'unknown' };
    f.comment.body = dispatchReceiptBody(repository, receipt);
    const snapshot = { runId: digest(`${repository}:7:refine:200:1`), issue: 7, stage: 'refine', workflowRunId: '200', workflowRevision: sha, sourceRevision: sha, taskDigest: f.request.taskDigest, autoImplement: false, dispatch: { commentId: 30, requestId: f.request.id, digest: receipt.digest } };
    const envelope = { schemaVersion: 1, result: { schemaVersion: 1, runId: snapshot.runId, stage: 'refine', gate: 'ready', status: 'passed', evidence: [], missingEvidence: [], unavailableChecks: [], pendingReview: [], nextAction: 'Owner: review.' }, effect: { type: 'issue-comment', body: 'The refinement is complete.' } };
    const readArtifact = async (...args) => args[4] === 'request.json' ? snapshot : args[4] === 'envelope.json' ? envelope : f.readArtifact(...args);
    const operations = [];
    let failRemove = alreadyWritten === false;
    const api = async (path, method = 'GET', body) => {
      if (path === 'issues/7/labels' && method === 'POST') { operations.push('add'); f.issue.labels.push({ name: body.labels[0] }); return; }
      if (path === 'issues/7/labels/refine' && method === 'DELETE') { if (failRemove) { failRemove = false; throw Error('label removal interrupted'); } operations.push('remove'); f.issue.labels = f.issue.labels.filter(label => label.name !== 'refine'); return; }
      if (path === 'issues/7/comments' && method === 'POST') operations.push('comment');
      return f.api(path, method, body);
    };
    if (alreadyWritten === false) await assert.rejects(prepareRecovery(api, repository, owner, 7, f.maintenance, true, Date.now(), readArtifact), /label removal interrupted/);
    const result = await prepareRecovery(api, repository, owner, 7, f.maintenance, true, Date.now(), readArtifact);
    assert.equal(result.request, undefined);
    if (alreadyWritten === 'competing') {
      assert.equal(operations.includes('add') || operations.includes('remove'), false);
      assert.doesNotMatch(f.comments.at(-1).body, /previous handoff was restored/);
      assert.equal(readDispatchReceipt(f.comment, repository, 7).status, 'unknown');
      continue;
    }
    assert.deepEqual(operations, alreadyWritten ? ['remove', 'comment'] : ['add', 'remove', 'comment']);
    assert.deepEqual(f.issue.labels.map(label => label.name), ['ready']);
    assert.equal(readDispatchReceipt(f.comment, repository, 7).status, 'completed');
    assert.equal(f.calls.some(call => call.path.endsWith('/dispatches')), false);
  }
});

test('maintenance restores a failed read-only publication idempotently after the final receipt update fails', async () => {
  const f = fixture();
  f.request.stage = 'refine'; f.request.id = dispatchId(repository, '100', 'refine');
  f.run.path = '.github/workflows/lighthouse-sdlc-refine.lock.yml';
  f.jobs[1].conclusion = 'success'; f.jobs[2].steps[0].conclusion = 'failure';
  f.issue.labels = [{ name: 'ready' }];
  const receipt = { ...f.receipt, stage: 'refine', id: f.request.id, digest: digest(JSON.stringify(f.request)), status: 'unknown' };
  f.comment.body = dispatchReceiptBody(repository, receipt);
  const snapshot = { runId: digest(`${repository}:7:refine:200:1`), issue: 7, stage: 'refine', workflowRunId: '200', workflowRevision: sha, sourceRevision: sha, taskDigest: f.request.taskDigest, autoImplement: false, dispatch: { commentId: 30, requestId: f.request.id, digest: receipt.digest } };
  const envelope = { schemaVersion: 1, result: { schemaVersion: 1, runId: snapshot.runId, stage: 'refine', gate: 'ready', status: 'passed', evidence: [], missingEvidence: [], unavailableChecks: [], pendingReview: [], nextAction: 'Owner: review.' }, effect: { type: 'issue-comment', body: 'The refinement is complete.' } };
  const readArtifact = async (...args) => args[4] === 'request.json' ? snapshot : args[4] === 'envelope.json' ? envelope : f.readArtifact(...args);
  let failPatch = true;
  const flaky = async (path, method, body) => { if (failPatch && path === 'issues/comments/30' && method === 'PATCH') { failPatch = false; throw Error('receipt unavailable'); } return f.api(path, method, body); };
  await assert.rejects(prepareRecovery(flaky, repository, owner, 7, f.maintenance, true, Date.now(), readArtifact), /receipt unavailable/);
  const countAfterPost = f.comments.length;
  const first = await prepareRecovery(flaky, repository, owner, 7, f.maintenance, true, Date.now(), readArtifact);
  assert.equal(first.request, undefined);
  assert.equal(f.comments.length, countAfterPost);
  assert.match(f.comments.at(-1).body, /previous handoff was restored/);
  assert.equal(readDispatchReceipt(f.comment, repository, 7).status, 'completed');
  assert.equal(f.calls.some(c => c.path.endsWith('/dispatches')), false);
  const count = f.comments.length;
  await prepareRecovery(f.api, repository, owner, 7, f.maintenance, true, Date.now(), readArtifact);
  assert.equal(f.comments.length, count);
});
