import { refinementAfterRun, signalRefinementContinuation } from '../packages/sdlc/src/stage-transition.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { digest } from '../packages/sdlc/src/host-contract.mjs';
import { feedbackKey, feedbackWorker } from '../packages/sdlc/src/proposal-review.mjs';
import { dispatchId, dispatchArtifact, dispatchReceiptBody, readDispatchReceipt, recordDispatch, sendDispatch, loadDispatch, verifyDispatchOrigin, claimDispatch, checkDispatchClaim, implementPath, stagePath, stages, finishDispatch, completedEvent } from '../packages/sdlc/src/stage-dispatch.mjs';

const repo = 'owner/repo', owner = 'owner', issue = 18;
function fixture(stage = 'implement') {
  const request = { schemaVersion: 1, id: dispatchId(repo, '100', stage), repository: repo, issue, stage, autoImplement: stage === 'refine', routerRunId: '100', routerAttempt: 1, workflowRevision: 'a'.repeat(40), sourceRevision: 'b'.repeat(40), taskDigest: 'c'.repeat(64), ref: 'main', eventName: 'workflow_dispatch', event: { inputs: { issue: '18', stage } }, handoff: false };
  const receipt = { schemaVersion: 1, stage, id: request.id, digest: digest(JSON.stringify(request)), routerRunId: '100', routerAttempt: 1, workerRunId: null };
  const comment = { id: 30, user: { login: 'github-actions[bot]', type: 'Bot' }, issue_url: `https://api.github.com/repos/${repo}/issues/${issue}`, html_url: `https://github.com/${repo}/issues/${issue}#issuecomment-30`, body: dispatchReceiptBody(repo, receipt) };
  const parent = { id: 100, run_attempt: 1, path: '.github/workflows/lighthouse-sdlc-router.yml', event: request.eventName, actor: { login: owner }, triggering_actor: { login: owner }, head_sha: request.workflowRevision, head_branch: request.ref, repository: { full_name: repo } };
  const worker = { id: 200, run_attempt: 1, path: stagePath(stage), event: 'workflow_dispatch', actor: { login: 'github-actions[bot]' }, triggering_actor: { login: 'github-actions[bot]' }, head_sha: request.workflowRevision, head_branch: request.ref, repository: { full_name: repo } };
  const calls = [], comments = [];
  const api = async (path, method = 'GET', body) => {
    calls.push({ path, method, body });
    if (path.startsWith(`issues/${issue}/comments?`)) return comments;
    if (path === `issues/${issue}/comments` && method === 'POST') { comment.body = body.body; comments.push(comment); return comment; }
    if (path === 'issues/comments/30') { if (method === 'PATCH') comment.body = body.body; return comment; }
    if (path === 'actions/runs/100/attempts/1') return parent;
    if (path === 'actions/runs/200') return worker;
    if (path.endsWith('/dispatches')) return null;
    throw Error(`Unexpected API request: ${method} ${path}`);
  };
  const readArtifact = async (apiArg, repository, run, name, file) => {
    assert.equal(repository, repo); assert.equal(String(run), '100'); assert.equal(name, dispatchArtifact(request)); assert.equal(file, 'dispatch.json');
    return request;
  };
  return { request, receipt, comment, parent, worker, calls, comments, api, readArtifact };
}

test('records intent before dispatch and reuses it across router reruns', async () => {
  const f = fixture();
  const first = await recordDispatch(f.api, repo, f.request);
  assert.equal(first.send, true);
  assert.equal(f.calls.some(c => c.path.endsWith('/dispatches')), false);
  await sendDispatch(f.api, repo, f.request, first.comment.id);
  const post = f.calls.find(c => c.path.endsWith('/dispatches'));
  assert.deepEqual(post.body, { ref: 'main', inputs: { issue: '18', 'dispatch-request': '30' } });
  assert.equal((await recordDispatch(f.api, repo, { ...f.request, routerAttempt: 2 })).send, false);
  assert.equal(f.calls.filter(c => c.path.endsWith('/dispatches')).length, 1);
});

test('feedback has one independent worker and dispatch identity across duplicate router events', async () => {
  for (const stage of ['propose', 'implement']) {
    const f = fixture(stage);
    const review = { number: 7, kind: 'comment', id: 99, feedbackDigest: 'd'.repeat(64), approved: false };
    const key = feedbackKey(review);
    Object.assign(f.request, { worker: feedbackWorker(review), feedbackKey: key, id: dispatchId(repo, key, stage) });
    const first = await recordDispatch(f.api, repo, f.request);
    f.worker.path = stagePath('apply-review');
    const loaded = await loadDispatch(f.api, repo, owner, issue, 30, f.worker, f.readArtifact);
    assert.equal(loaded.request.stage, stage);
    await sendDispatch(f.api, repo, f.request, 30);
    assert.ok(f.calls.some(c => c.path === 'actions/workflows/lighthouse-sdlc-apply-review.lock.yml/dispatches'));
    assert.equal((await recordDispatch(f.api, repo, { ...f.request, routerRunId: '101' })).send, false);
    assert.equal(f.calls.filter(c => c.path.endsWith('/dispatches')).length, 1);
    await assert.rejects(loadDispatch(f.api, repo, owner, issue, 30, { ...f.worker, path: stagePath(stage) }, f.readArtifact), /worker identity/);
    assert.equal(first.receipt.worker, 'apply-review');
    assert.notEqual(feedbackKey({ ...review, feedbackDigest: 'e'.repeat(64) }), key);
    assert.equal(feedbackWorker({ ...review, approved: true }), undefined);
  }
});

test('a lost dispatch response leaves recorded uncertainty, never an automatic resend', async () => {
  const f = fixture();
  await recordDispatch(f.api, repo, f.request);
  const brokenApi = async (...args) => { await f.api(...args); if (args[0].endsWith('/dispatches')) throw Error('Response lost'); };
  // Preserve all reads while failing after the remote dispatch has been accepted.
  await assert.rejects(sendDispatch(async (...args) => args[0].endsWith('/dispatches') ? brokenApi(...args) : f.api(...args), repo, f.request, 30), /Response lost/);
  assert.equal((await recordDispatch(f.api, repo, f.request)).send, false);
  const next = { ...f.request, id: dispatchId(repo, '101'), routerRunId: '101' };
  await assert.rejects(recordDispatch(f.api, repo, next), /unconfirmed/);
  assert.equal(f.calls.filter(c => c.path.endsWith('/dispatches')).length, 1);
});

test('authenticates the original owner event and binds it to this worker revision', async () => {
  const f = fixture();
  const loaded = await loadDispatch(f.api, repo, owner, issue, 30, f.worker, f.readArtifact);
  assert.deepEqual(loaded.request.event, f.request.event);
  assert.notEqual(f.request.sourceRevision, f.request.workflowRevision, 'Product and workflow revisions have separate identities');
  for (const patch of [{ actor: { login: 'outsider' } }, { triggering_actor: { login: 'outsider' } }, { path: '.github/workflows/other.yml' }, { event: 'pull_request' }, { head_sha: 'd'.repeat(40) }, { repository: { full_name: 'other/repo' } }, { run_attempt: 2 }]) {
    assert.throws(() => verifyDispatchOrigin(f.request, f.receipt, { ...f.parent, ...patch }, f.worker, repo, owner, issue), /router execution/);
  }
  for (const patch of [{ path: '.github/workflows/other.yml' }, { head_sha: 'd'.repeat(40) }, { actor: { login: 'outsider' } }, { triggering_actor: { login: 'outsider' } }, { event: 'push' }, { head_branch: 'other' }]) {
    assert.throws(() => verifyDispatchOrigin(f.request, f.receipt, f.parent, { ...f.worker, ...patch }, repo, owner, issue), /worker identity/);
  }
  assert.throws(() => verifyDispatchOrigin({ ...f.request, issue: 19 }, f.receipt, f.parent, f.worker, repo, owner, issue), /artifact identity/);
  assert.throws(() => verifyDispatchOrigin({ ...f.request, event: { inputs: { stage: 'integrate' } } }, f.receipt, f.parent, f.worker, repo, owner, issue), /artifact identity/);
});

test('HTML markers are references, not authority: spoofed, moved and edited receipts fail closed', async () => {
  const f = fixture();
  for (const patch of [{ user: { login: 'outsider', type: 'Bot' } }, { user: { login: 'github-actions[bot]', type: 'User' } }, { issue_url: `https://api.github.com/repos/${repo}/issues/19` }, { body: f.comment.body + f.comment.body }]) {
    assert.throws(() => readDispatchReceipt({ ...f.comment, ...patch }, repo, issue));
  }
  f.comment.body = dispatchReceiptBody(repo, { ...f.receipt, digest: 'f'.repeat(64) });
  await assert.rejects(loadDispatch(f.api, repo, owner, issue, 30, f.worker, f.readArtifact), /artifact identity/);
});

test('missing or expired origin evidence prevents admission', async () => {
  const f = fixture();
  await assert.rejects(loadDispatch(f.api, repo, owner, issue, 30, f.worker, async () => { throw Error('Required artifact unavailable'); }), /artifact unavailable/);
  assert.equal(f.calls.some(c => c.method === 'PATCH'), false);
});

test('serialized workers claim once; a duplicate and a rerun cannot start another agent', async () => {
  const f = fixture();
  const first = await loadDispatch(f.api, repo, owner, issue, 30, f.worker, f.readArtifact);
  assert.equal(await claimDispatch(f.api, repo, first, '200'), true);
  const duplicate = await loadDispatch(f.api, repo, owner, issue, 30, { ...f.worker, id: 201 }, f.readArtifact);
  assert.equal(await claimDispatch(f.api, repo, duplicate, '201'), false);
  assert.equal(await claimDispatch(f.api, repo, first, '200'), false);
  assert.equal(f.calls.filter(c => c.method === 'PATCH').length, 1);
  const binding = { commentId: 30, requestId: f.request.id, digest: f.receipt.digest };
  await checkDispatchClaim(f.api, repo, issue, binding, '200');
  await assert.rejects(checkDispatchClaim(f.api, repo, issue, binding, '201'), /revoked or changed/);
  f.comment.body = dispatchReceiptBody(repo, { ...f.receipt, workerRunId: '201' });
  await assert.rejects(checkDispatchClaim(f.api, repo, issue, binding, '200'), /revoked or changed/);
});

test('a different request cannot overlap an active implementation, but a finished run can be followed', async () => {
  const f = fixture();
  await recordDispatch(f.api, repo, f.request);
  await claimDispatch(f.api, repo, { request: f.request, receipt: f.receipt, commentId: 30 }, '200');
  const next = { ...f.request, id: dispatchId(repo, '101'), routerRunId: '101' };
  f.worker.status = 'in_progress';
  await assert.rejects(recordDispatch(f.api, repo, next), /pending or running/);
  f.worker.status = 'completed'; f.worker.conclusion = 'failure';
  assert.equal((await recordDispatch(f.api, repo, next)).send, true);
});


test('all installed stages dispatch independently and cannot impersonate a different stage', async () => {
  for (const stage of stages) {
    const f = fixture(stage);
    await recordDispatch(f.api, repo, f.request);
    await sendDispatch(f.api, repo, f.request, 30);
    assert.equal(f.calls.find(c => c.path.endsWith('/dispatches')).path, `actions/workflows/lighthouse-sdlc-${stage}.lock.yml/dispatches`);
    const dispatch = await loadDispatch(f.api, repo, owner, issue, 30, f.worker, f.readArtifact);
    assert.equal(await claimDispatch(f.api, repo, dispatch, '200'), true);
    for (const outcome of ['blocked', 'passed', undefined]) {
      await finishDispatch(f.api, repo, issue, 30, '201', outcome);
      assert.equal(readDispatchReceipt(f.comment, repo, issue).status, 'running');
      await finishDispatch(f.api, repo, issue, 30, '200', outcome);
      assert.equal(readDispatchReceipt(f.comment, repo, issue).status, outcome === 'passed' ? 'completed' : outcome === 'blocked' ? 'waiting' : 'failed');
      f.comment.body = dispatchReceiptBody(repo, { ...readDispatchReceipt(f.comment, repo, issue), status: 'running' });
    }
    await assert.rejects(loadDispatch(f.api, repo, owner, issue, 30, { ...f.worker, path: stagePath(stage === 'refine' ? 'propose' : 'refine') }, f.readArtifact), /worker identity/);
  }
});

test('completed-run replay uses fresh observations and requires the owner', async () => {
  const api = async path => { assert.equal(path, 'actions/runs/200'); return { id: 200, head_sha: 'a'.repeat(40) }; };
  const event = { inputs: { after_run: '200' } }, env = { GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_ACTOR: owner, GITHUB_TRIGGERING_ACTOR: owner, GITHUB_REPOSITORY_OWNER: owner };
  assert.deepEqual(await completedEvent(api, event, env), { action: 'completed', workflow_run: { id: 200, head_sha: 'a'.repeat(40) } });
  await assert.rejects(completedEvent(api, event, { ...env, GITHUB_ACTOR: 'outsider' }), /requires an owner/);
});

test('refinement handoff requires an authenticated successful publication and the installed policy', async () => {
  const f = fixture('refine');
  await recordDispatch(f.api, repo, f.request);
  await claimDispatch(f.api, repo, { request: f.request, receipt: f.receipt, commentId: 30 }, '200');
  Object.assign(f.worker, { status: 'completed', conclusion: 'success' });
  const snapshot = { issue, stage: 'refine', runId: 'e'.repeat(64), workflowRunId: '200', workflowRevision: f.request.workflowRevision, sourceRevision: f.request.sourceRevision, autoImplement: true, dispatch: { commentId: 30, requestId: f.request.id, digest: f.receipt.digest } };
  const envelope = { schemaVersion: 1, result: { schemaVersion: 1, runId: snapshot.runId, stage: 'refine', status: 'passed', gate: 'ready', evidence: [{ id: 'scope', status: 'passed' }], missingEvidence: [], unavailableChecks: [], pendingReview: [], nextAction: 'implement' }, effect: { type: 'issue-comment', body: 'Ready' } };
  const report = { user: { login: 'github-actions[bot]', type: 'Bot' }, body: `<!-- lighthouse-actions:${snapshot.runId} -->\n<!-- lighthouse-stage:refine:passed -->` };
  f.comments.push(report);
  const signals = [];
  const signalApi = async (path, method, body) => { if (path === '') return { default_branch: 'main' }; signals.push({ path, method, body }); };
  assert.equal(await signalRefinementContinuation(signalApi, snapshot, envelope), true);
  assert.deepEqual(signals, [{ path: 'actions/workflows/lighthouse-sdlc-router.yml/dispatches', method: 'POST', body: { ref: 'main', inputs: { issue: '18', stage: 'implement', after_run: '200' } } }]);
  for (const patch of [{ stage: 'implement' }, { autoImplement: false }, { dispatch: undefined }]) assert.equal(await signalRefinementContinuation(signalApi, { ...snapshot, ...patch }, envelope), false);
  for (const patch of [{ status: 'blocked' }, { gate: 'waiting' }]) assert.equal(await signalRefinementContinuation(signalApi, snapshot, { ...envelope, result: { ...envelope.result, ...patch } }), false);
  assert.equal(signals.length, 1);
  let attempts = 0;
  await assert.rejects(signalRefinementContinuation(async path => { if (path === '') return { default_branch: 'main' }; attempts++; throw Error('Response lost'); }, snapshot, envelope), /Response lost/);
  assert.equal(attempts, 1, 'Never retry an uncertain dispatch');
  const api = async (...args) => args[0] === 'actions/runs/200/artifacts?per_page=100' ? { total_count: 1, artifacts: [{ name: 'lighthouse-input-18-1' }] } : f.api(...args);
  const readArtifact = async (a, r, run, name, file) => String(run) === '100' ? f.readArtifact(a, r, run, name, file) : file === 'request.json' ? snapshot : envelope;
  const event = { action: 'completed', workflow_run: { id: 200, head_sha: f.worker.head_sha } };
  assert.deepEqual((await refinementAfterRun(api, repo, owner, event, readArtifact)).predecessor, { runId: '200', attempt: 1 });
  envelope.result.output = { estimate: { points: 13, status: 'confirmed', confidence: 'medium', rationale: { scope: 'Several outcomes', dependencies: 'Related changes', verification: 'Independent checks' }, uncertainty: [] }, decomposition: { schemaVersion: 1, parent: { id: 'GH-18', title: 'Parent' }, slices: [{ id: 'a', title: 'First outcome', acceptance: ['First outcome verified'], dependencies: [] }, { id: 'b', title: 'Second outcome', acceptance: ['Second outcome verified'], dependencies: [] }] } };
  assert.equal(await signalRefinementContinuation(signalApi, snapshot, envelope), false);
  assert.equal(await refinementAfterRun(api, repo, owner, event, readArtifact), null);
  delete envelope.result.output;
  const next = fixture();
  Object.assign(next.request, { routerRunId: '300', eventRunId: '200', id: dispatchId(repo, '200', 'implement'), handoff: true, predecessor: { runId: '200', attempt: 1 }, event: { inputs: { issue: '18', stage: 'implement', after_run: '200' } } });
  Object.assign(next.parent, { id: 300, actor: { login: 'github-actions[bot]' }, triggering_actor: { login: 'github-actions[bot]' } });
  next.comment.body = dispatchReceiptBody(repo, { ...next.receipt, routerRunId: '300', eventRunId: '200', id: next.request.id, digest: digest(JSON.stringify(next.request)) });
  const chainApi = async (...args) => args[0] === 'issues/comments/31' ? next.comment : args[0] === 'actions/runs/300/attempts/1' ? next.parent : api(...args);
  const chainArtifact = async (a, r, run, name, file) => String(run) === '300' ? next.request : readArtifact(a, r, run, name, file);
  assert.equal((await loadDispatch(chainApi, repo, owner, issue, 31, { ...next.worker, id: 400 }, chainArtifact)).request.id, next.request.id);
  f.parent.actor.login = 'outsider';
  await assert.rejects(loadDispatch(chainApi, repo, owner, issue, 31, { ...next.worker, id: 400 }, chainArtifact), /authorized router/);
  f.parent.actor.login = owner;
  for (const conclusion of ['failure', 'cancelled', 'skipped']) { f.worker.conclusion = conclusion; assert.equal(await refinementAfterRun(api, repo, owner, event, readArtifact), null); }
  f.worker.conclusion = 'success';
  snapshot.autoImplement = false; assert.equal(await refinementAfterRun(api, repo, owner, event, readArtifact), null); snapshot.autoImplement = true;
  envelope.result.status = 'blocked'; envelope.result.missingEvidence = ['scope']; assert.equal(await refinementAfterRun(api, repo, owner, event, readArtifact), null); envelope.result.status = 'passed'; envelope.result.missingEvidence = [];
  f.comments.pop(); assert.equal(await refinementAfterRun(api, repo, owner, event, readArtifact), null); f.comments.push(report);
  snapshot.dispatch.digest = 'f'.repeat(64); await assert.rejects(refinementAfterRun(api, repo, owner, event, readArtifact), /revoked or changed/);
});

test('bot wake-up waits for refinement completion and rejects other callers and stages', async () => {
  const event = { inputs: { issue: '18', stage: 'implement', after_run: '200' } };
  const env = { GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_ACTOR: 'github-actions[bot]', GITHUB_TRIGGERING_ACTOR: 'github-actions[bot]', GITHUB_REPOSITORY_OWNER: owner };
  const run = { id: 200, head_sha: 'a'.repeat(40), path: stagePath('refine'), status: 'in_progress' };
  let waits = 0;
  const result = await completedEvent(async () => run, event, env, async ms => { assert.equal(ms, 5000); waits++; run.status = 'completed'; });
  assert.equal(waits, 1); assert.equal(result.workflow_run.id, 200);
  for (const patch of [{ GITHUB_ACTOR: 'outsider' }, { GITHUB_TRIGGERING_ACTOR: 'outsider' }, { GITHUB_EVENT_NAME: 'issue_comment' }]) await assert.rejects(completedEvent(async () => run, event, { ...env, ...patch }), /requires an owner/);
  for (const patch of [{ stage: 'integrate' }, { after_run: 'bad' }, { issue: '' }]) await assert.rejects(completedEvent(async () => run, { inputs: { ...event.inputs, ...patch } }, env), /requires an owner/);
  await assert.rejects(completedEvent(async () => ({ ...run, path: implementPath }), event, env), /reference a refinement/);
  run.status = 'in_progress'; waits = 0;
  await assert.rejects(completedEvent(async () => run, event, env, async () => { waits++; }), /timed out/);
  assert.equal(waits, 24);
});

test('bot router artifacts cannot authorize arbitrary stages or fabricate refinement authority', async () => {
  const f = fixture();
  Object.assign(f.request, { eventRunId: '50', id: dispatchId(repo, '50', 'implement'), handoff: true, predecessor: { runId: '50', attempt: 1 }, event: { inputs: { issue: '18', stage: 'implement', after_run: '50' } } });
  Object.assign(f.parent, { actor: { login: 'github-actions[bot]' }, triggering_actor: { login: 'github-actions[bot]' } });
  const receipt = { ...f.receipt, id: f.request.id, eventRunId: '50', digest: digest(JSON.stringify(f.request)) };
  assert.doesNotThrow(() => verifyDispatchOrigin(f.request, receipt, f.parent, f.worker, repo, owner, issue));
  for (const patch of [{ handoff: false }, { event: { inputs: { issue: '19', stage: 'implement', after_run: '50' } } }, { predecessor: { runId: '51', attempt: 1 } }, { event: { inputs: { issue: '18', stage: 'integrate', after_run: '50' } } }]) {
    const request = { ...f.request, ...patch };
    assert.throws(() => verifyDispatchOrigin(request, { ...receipt, digest: digest(JSON.stringify(request)) }, f.parent, f.worker, repo, owner, issue), /authorized router/);
  }
  f.comment.body = dispatchReceiptBody(repo, receipt);
  const api = async (...args) => args[0] === 'actions/runs/50' ? { id: 50, path: stagePath('refine'), head_sha: 'a'.repeat(40), status: 'completed', conclusion: 'failure' } : f.api(...args);
  await assert.rejects(loadDispatch(api, repo, owner, issue, 30, f.worker, f.readArtifact), /authenticated refinement/);
});

test('duplicate completion events retain the same request ID across router executions', async () => {
  const f = fixture('implement');
  const eventRunId = '50';
  const request = { ...f.request, eventName: 'workflow_run', event: { action: 'completed', workflow_run: { id: 50 } }, eventRunId, id: dispatchId(repo, eventRunId, 'implement') };
  await recordDispatch(f.api, repo, request);
  assert.equal((await recordDispatch(f.api, repo, { ...request, routerRunId: '101' })).send, false);
  assert.equal((await recordDispatch(f.api, repo, { ...request, routerRunId: '102', eventName: 'workflow_dispatch', event: { inputs: { issue: '18', stage: 'implement', after_run: eventRunId } } })).send, false);
  const receipt = readDispatchReceipt(f.comment, repo, issue);
  const parent = { ...f.parent, event: 'workflow_run', actor: { login: 'github-actions[bot]' }, triggering_actor: { login: 'github-actions[bot]' } };
  assert.doesNotThrow(() => verifyDispatchOrigin(request, receipt, parent, f.worker, repo, owner, issue));
  const edited = { ...request, event: { action: 'completed', workflow_run: { id: 51 } } };
  assert.throws(() => verifyDispatchOrigin(edited, { ...receipt, digest: digest(JSON.stringify(edited)) }, parent, f.worker, repo, owner, issue), /event identity/);
});


test('owner PR feedback may queue behind a confirmed worker while uncertain dispatch remains blocked', async () => {
  const f = fixture();
  await recordDispatch(f.api, repo, f.request);
  await claimDispatch(f.api, repo, { request: f.request, receipt: f.receipt, commentId: 30 }, '200');
  f.worker.status = 'in_progress';
  const next = { ...f.request, id: dispatchId(repo, '101'), routerRunId: '101', queue: true };
  assert.equal((await recordDispatch(f.api, repo, next)).send, true);
  await assert.rejects(recordDispatch(f.api, repo, { ...next, id: dispatchId(repo, '102'), routerRunId: '102' }), /unconfirmed/);
});


test('PR event identity is preserved separately from the trusted dispatchable workflow branch', () => {
  const f = fixture('integrate');
  const request = { ...f.request, routerRevision: 'd'.repeat(40), routerRef: 'feature', eventName: 'pull_request_review', event: { action: 'submitted', review: { id: 9 } } };
  const receipt = { ...f.receipt, digest: digest(JSON.stringify(request)) };
  const parent = { ...f.parent, event: 'pull_request_review', head_sha: request.routerRevision, head_branch: request.routerRef };
  assert.doesNotThrow(() => verifyDispatchOrigin(request, receipt, parent, f.worker, repo, owner, issue));
  assert.throws(() => verifyDispatchOrigin(request, receipt, { ...parent, head_sha: f.worker.head_sha }, f.worker, repo, owner, issue), /authorized router/);
  assert.throws(() => verifyDispatchOrigin(request, receipt, parent, { ...f.worker, head_branch: 'feature' }, repo, owner, issue), /worker identity/);
});

test('execution model selection is bound to an authenticated direct owner dispatch', async () => {
  const f = fixture('refine');
  f.request.event.inputs.model_selection = JSON.stringify({ model: 'openai/example', reasoningEffort: 'high' });
  f.receipt.digest = digest(JSON.stringify(f.request));
  const { executionModelSelection } = await import('../packages/sdlc/src/stage-dispatch.mjs');
  verifyDispatchOrigin(f.request, f.receipt, f.parent, f.worker, repo, owner, issue);
  assert.deepEqual(executionModelSelection(f.request), { model: 'openai/example', reasoningEffort: 'high' });
  f.parent.actor.login = 'intruder';
  assert.throws(() => verifyDispatchOrigin(f.request, f.receipt, f.parent, f.worker, repo, owner, issue), /authorized router/);
  f.parent.actor.login = owner;
  for (const change of [{ handoff: true }, { recovery: {} }, { worker: 'product-change' }, { eventName: 'issue_comment' }]) {
    assert.throws(() => executionModelSelection({ ...f.request, ...change }), /direct owner/);
  }
  assert.throws(() => executionModelSelection({ ...f.request, event: { inputs: { model_selection: '{' } } }), /JSON/);
  assert.throws(() => executionModelSelection({ ...f.request, event: { inputs: { ...f.request.event.inputs, after_run: '99' } } }), /direct owner/);
  assert.throws(() => executionModelSelection({ ...f.request, event: { inputs: { ...f.request.event.inputs, workflow: 'product-change' } } }), /direct owner/);
  f.request.event.inputs.model_selection = JSON.stringify({ profile: 'fast' });
  assert.throws(() => verifyDispatchOrigin(f.request, f.receipt, f.parent, f.worker, repo, owner, issue), /artifact identity/);
});
