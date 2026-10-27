import test from 'node:test';
import assert from 'node:assert/strict';
import { digest } from '../packages/sdlc/src/host-contract.mjs';
import { dispatchId, dispatchArtifact, dispatchReceiptBody, readDispatchReceipt, recordDispatch, sendDispatch, loadDispatch, verifyDispatchOrigin, claimDispatch, checkDispatchClaim, implementPath } from '../packages/sdlc/src/implement-dispatch.mjs';

const repo = 'owner/repo', owner = 'owner', issue = 18;
function fixture() {
  const request = { schemaVersion: 1, id: dispatchId(repo, '100'), repository: repo, issue, stage: 'implement', routerRunId: '100', routerAttempt: 1, workflowRevision: 'a'.repeat(40), sourceRevision: 'b'.repeat(40), taskDigest: 'c'.repeat(64), ref: 'main', eventName: 'workflow_dispatch', event: { inputs: { issue: '18', stage: 'implement' } }, handoff: false };
  const receipt = { schemaVersion: 1, id: request.id, digest: digest(JSON.stringify(request)), routerRunId: '100', routerAttempt: 1, workerRunId: null };
  const comment = { id: 30, user: { login: 'github-actions[bot]', type: 'Bot' }, issue_url: `https://api.github.com/repos/${repo}/issues/${issue}`, html_url: `https://github.com/${repo}/issues/${issue}#issuecomment-30`, body: dispatchReceiptBody(repo, receipt) };
  const parent = { id: 100, run_attempt: 1, path: '.github/workflows/lighthouse-sdlc-router.yml', event: request.eventName, actor: { login: owner }, triggering_actor: { login: owner }, head_sha: request.workflowRevision, head_branch: request.ref, repository: { full_name: repo } };
  const worker = { id: 200, run_attempt: 1, path: implementPath, event: 'workflow_dispatch', actor: { login: 'github-actions[bot]' }, triggering_actor: { login: 'github-actions[bot]' }, head_sha: request.workflowRevision, head_branch: request.ref, repository: { full_name: repo } };
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
