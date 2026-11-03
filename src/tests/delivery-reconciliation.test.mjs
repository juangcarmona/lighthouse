import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { dispatchIntent, dispatchId, recordDispatch, sendDispatch, dispatchReceiptBody, claimDispatch, stagePath } from '../packages/sdlc/src/stage-dispatch.mjs';
import { implementationContinuation } from '../packages/sdlc/src/delivery-request.mjs';
import { completionSource } from '../packages/sdlc/src/delivery-events.mjs';
import { completionSubscriptions, workflowDisplayName } from '../packages/sdlc/src/workflow-completions.mjs';
import { digest } from '../packages/sdlc/src/host-contract.mjs';

const repository = 'owner/repo', revision = 'a'.repeat(40), source = 'b'.repeat(40), task = 'c'.repeat(64), identity = 'd'.repeat(64), head = 'e'.repeat(40);
const bot = { login: 'github-actions[bot]', type: 'Bot' };
const file = value => ({ content: Buffer.from(JSON.stringify(value)).toString('base64') });
function fixture() {
  const request = { schemaVersion: 1, id: dispatchId(repository, '100'), repository, issue: 18, stage: 'implement', routerRunId: '100', routerAttempt: 1, workflowRevision: revision, sourceRevision: source, taskDigest: task, ref: 'main', eventName: 'workflow_dispatch', event: { inputs: { issue: '18', stage: 'implement' } }, handoff: false };
  request.intent = dispatchIntent(request);
  const parent = { id: 100, run_attempt: 1, path: '.github/workflows/lighthouse-sdlc-router.yml', event: 'workflow_dispatch', actor: { login: 'owner' }, triggering_actor: { login: 'owner' }, head_sha: revision, head_branch: 'main', repository: { full_name: repository } };
  const run = { id: 200, run_attempt: 1, path: stagePath('implement'), event: 'workflow_dispatch', actor: bot, triggering_actor: bot, head_sha: revision, head_branch: 'main', status: 'completed', conclusion: 'success', repository: { full_name: repository } };
  const receipt = { schemaVersion: 1, stage: 'implement', intent: request.intent, id: request.id, digest: digest(JSON.stringify(request)), routerRunId: '100', routerAttempt: 1, workerRunId: '200', status: 'completed' };
  const pr = { number: 60, state: 'open', merged: false, draft: false, user: bot, head: { sha: head, ref: `lighthouse/implement-18-${identity.slice(0, 12)}`, repo: { full_name: repository } }, base: { ref: 'main', repo: { full_name: repository } }, body: `<!-- lighthouse-implementation:${identity} -->`, html_url: 'https://github.com/owner/repo/pull/60' };
  const comment = { id: 30, user: bot, issue_url: `https://api.github.com/repos/${repository}/issues/18`, html_url: 'https://github.com/owner/repo/issues/18#issuecomment-30', body: dispatchReceiptBody(repository, receipt) };
  const proof = { id: 31, user: bot, body: `<!-- lighthouse-pr-state:${JSON.stringify({ pr: 60, head, complete: true, run: 200, implementationIdentity: identity })} -->` };
  const comments = [comment, proof], writes = [];
  const snapshot = { runId: identity, issue: 18, stage: 'implement', workflowRunId: '200', sourceRevision: source, taskDigest: task, dispatch: { commentId: 30, requestId: request.id, digest: receipt.digest } };
  const api = async (path, method = 'GET', body) => {
    if (method !== 'GET') writes.push({ path, method, body });
    if (path === '') return { default_branch: 'main' };
    if (path.startsWith('issues/18/comments?')) return comments;
    if (path === 'issues/comments/30') { if (method === 'PATCH') comment.body = body.body; return comment; }
    if (path === 'issues/18/comments' && method === 'POST') { const c = { ...comment, id: 32, body: body.body }; comments.push(c); return c; }
    if (path === 'pulls?state=open&per_page=100') return [pr];
    if (path === 'pulls/60') return pr;
    if (path === 'actions/runs/200') return run;
    if (path === 'actions/runs/100/attempts/1') return parent;
    if (path.endsWith('/dispatches')) return null;
    throw Error('Unexpected API: ' + path);
  };
  const readArtifact = async (api, repo, id, name) => { assert.equal(repo, repository); return name.startsWith('lighthouse-dispatch-') ? request : snapshot; };
  return { request, parent, run, receipt, pr, comment, proof, comments, writes, snapshot, api, readArtifact };
}
const nextRequest = (request, patch = {}) => {
  const next = { ...request, id: dispatchId(repository, '101'), routerRunId: '101', ...patch };
  next.intent = dispatchIntent(next); return next;
};

test('different events for the same grant reuse both an active and completed authenticated execution', async () => {
  const f = fixture();
  const manual = nextRequest(f.request);
  const resumed = nextRequest(f.request, { eventName: 'issues', event: { action: 'unlabeled', label: { name: 'future' } }, handoff: true });
  assert.equal(manual.intent, resumed.intent);
  f.run.status = 'in_progress';
  assert.equal((await recordDispatch(f.api, repository, resumed)).send, false);
  f.run.status = 'completed';
  assert.equal((await recordDispatch(f.api, repository, manual)).send, false);
  assert.equal(f.writes.length, 0);
  f.run.head_sha = source;
  await assert.rejects(recordDispatch(f.api, repository, manual), /identity changed/);
});

test('changed intent cannot overlap active work and edited intent metadata is rejected', async () => {
  const f = fixture(); f.run.status = 'in_progress';
  await assert.rejects(recordDispatch(f.api, repository, nextRequest(f.request, { taskDigest: 'f'.repeat(64) })), /pending or running/);
  await assert.rejects(recordDispatch(f.api, repository, { ...nextRequest(f.request), sourceRevision: head }), /Invalid dispatch intent binding/);
  assert.equal(f.writes.length, 0);
});

test('a lost dispatch response remains unconfirmed; neither equivalent nor changed events resend it', async () => {
  const f = fixture(); f.receipt.workerRunId = null; f.receipt.status = 'requested'; f.comment.body = dispatchReceiptBody(repository, f.receipt);
  await assert.rejects(sendDispatch(async (...args) => { const result = await f.api(...args); if (args[0].endsWith('/dispatches')) throw Error('Response lost after acceptance'); return result; }, repository, f.request, 30), /Response lost/);
  assert.equal((await recordDispatch(f.api, repository, f.request)).send, false);
  for (const next of [nextRequest(f.request), nextRequest(f.request, { taskDigest: 'f'.repeat(64) })]) await assert.rejects(recordDispatch(f.api, repository, next), /unconfirmed/);
  assert.equal(f.writes.filter(x => x.path.endsWith('/dispatches')).length, 1);
  await claimDispatch(f.api, repository, { request: f.request, receipt: f.receipt, commentId: 30 }, '200');
  f.run.status = 'in_progress';
  assert.equal((await recordDispatch(f.api, repository, nextRequest(f.request))).send, false);
});

test('failed or blocked work can receive a fresh owner request; uncertain outcomes stop instead', async () => {
  for (const status of ['failed', 'blocked', 'waiting', 'cancelled']) {
    const f = fixture(); f.receipt.status = status; f.comment.body = dispatchReceiptBody(repository, f.receipt);
    assert.equal((await recordDispatch(f.api, repository, nextRequest(f.request))).send, true);
  }
  for (const status of ['unknown', 'running', 'requested']) {
    const f = fixture(); f.receipt.status = status; f.comment.body = dispatchReceiptBody(repository, f.receipt);
    await assert.rejects(recordDispatch(f.api, repository, nextRequest(f.request)), /uncertain/);
    assert.equal(f.writes.length, 0);
  }
});

test('effective scope, source, workflow, feedback, model and merge authority do not collapse into one grant', () => {
  const f = fixture();
  for (const patch of [{ taskDigest: 'f'.repeat(64) }, { sourceRevision: head }, { workflowRevision: head }, { worker: 'apply-review', feedbackKey: 'f'.repeat(64) }, { completionAuthorization: { pr: 60, head, merge: false } }, { event: { inputs: { model_selection: '{"reasoningEffort":"high"}' } } }]) assert.notEqual(dispatchIntent({ ...f.request, ...patch }), f.request.intent);
  assert.notEqual(dispatchIntent({ ...f.request, completionAuthorization: { pr: 60, head, merge: true } }), dispatchIntent({ ...f.request, completionAuthorization: { pr: 60, head, merge: false } }));
});

test('an eligible current candidate is linked before any new worker, and stale or missing proof is explicit', async () => {
  const f = fixture();
  const inspect = () => implementationContinuation(f.api, repository, 'owner', nextRequest(f.request), f.readArtifact);
  assert.deepEqual(await inspect(), { status: 'completed', pr: 60, head, url: f.pr.html_url, reason: 'An authenticated current candidate already exists; continue its CI and review.' });
  f.snapshot.taskDigest = 'f'.repeat(64); assert.match((await inspect()).reason, /intent changed/);
  f.snapshot.taskDigest = task; f.snapshot.sourceRevision = head; assert.match((await inspect()).reason, /source evidence is stale/);
  f.snapshot.sourceRevision = source; f.pr.head.sha = source; assert.match((await inspect()).reason, /Current-head implementation evidence/);
  f.pr.head.sha = head; f.pr.base.repo.full_name = 'foreign/repo'; assert.equal((await inspect()).status, 'blocked');
  assert.equal(f.writes.length, 0);
  assert.equal(await implementationContinuation(f.api, repository, 'owner', { ...f.request, worker: 'apply-review' }, f.readArtifact), null);
});

test('completion classification covers adopted checks, bot continuations, product apply and unrelated subjects', async () => {
  const f = fixture(), event = { action: 'completed', workflow_run: { id: 200, head_sha: revision } };
  let pulls = [f.pr];
  const api = (path, ...args) => path.startsWith('contents/') ? file({ completion: { postMergeWorkflows: ['ci.yml'] } }) : path.startsWith('commits/') ? pulls : f.api(path, ...args);
  assert.equal(await completionSource(api, repository, event), null);
  assert.equal(await completionSource(api, repository, event, { LIGHTHOUSE_PRODUCT_CHANGE_ENABLED: 'true' }), 'stage');
  f.run.path = stagePath('apply-product-change');
  assert.equal(await completionSource(api, repository, event, { LIGHTHOUSE_PRODUCT_CHANGE_ENABLED: 'true' }), 'stage');
  f.run.path = stagePath('refine'); assert.equal(await completionSource(api, repository, event), 'stage');
  f.run.path = '.github/workflows/ci.yml'; f.pr.head.sha = revision;
  for (const conclusion of ['success', 'failure']) { f.run.conclusion = conclusion; assert.equal(await completionSource(api, repository, event), 'checks'); }
  pulls = []; assert.equal(await completionSource(api, repository, event), null);
  pulls = [f.pr]; f.pr.user = { login: 'owner', type: 'User' }; assert.equal(await completionSource(api, repository, event), null);
  f.run.path = '.github/workflows/packages.yml'; assert.equal(await completionSource(api, repository, event), null);
  f.run.path = stagePath('refine'); f.run.conclusion = 'success'; f.run.repository.full_name = 'foreign/repo'; assert.equal(await completionSource(api, repository, event), null);
});

test('installer subscribes only to selected continuations and adopted CI names, preserving custom names', async () => {
  const root = await mkdtemp(join(tmpdir(), 'lh321-'));
  try {
    const options = { implement: true, propose: true, productChange: false };
    assert.deepEqual(await completionSubscriptions(root, options), ['refine']);
    await mkdir(join(root, '.lighthouse')); await mkdir(join(root, '.github/workflows'), { recursive: true });
    await writeFile(join(root, '.lighthouse/github.json'), JSON.stringify({ completion: { postMergeWorkflows: ['ci.yml'] } }));
    await writeFile(join(root, '.github/workflows/ci.yml'), 'name: "[CI] custom checks"\n');
    assert.deepEqual(await completionSubscriptions(root, options), ['refine', '\\[CI\\] custom checks']);
    const product = await completionSubscriptions(root, { ...options, productChange: true });
    assert.ok(product.includes('apply-product-change')); assert.ok(product.includes('apply review')); assert.ok(!product.includes('*'));
    assert.equal(workflowDisplayName('on: push\n', '.github/workflows/ci.yml'), '.github/workflows/ci.yml');
    assert.equal(workflowDisplayName("name: 'Owner''s CI'\n", 'ci.yml'), "Owner's CI");
    assert.throws(() => workflowDisplayName('name: >\n  CI\n', 'ci.yml'), /static workflow name/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
