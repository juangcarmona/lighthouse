import test from 'node:test';
import assert from 'node:assert/strict';
import { digest } from '../packages/sdlc/src/digests.mjs';
import { dispatchIntent, dispatchReceiptBody, readDispatchReceipt, verifyDispatchOrigin, loadDispatch, admitDispatch } from '../packages/sdlc/src/stage-dispatch.mjs';
import { observeDispatch, prepareRecovery, verifyRecoveryOrigin } from '../packages/sdlc/src/worker-recovery.mjs';

import { fixture } from './helpers/continuation-admission-fixture.mjs';

const repository = 'owner/repo', owner = 'owner', old = 'a'.repeat(40), current = 'b'.repeat(40), head = 'c'.repeat(40);

test('late default-branch move keeps exact worker rejection distinguishable from an untrusted origin', async () => {
  const f = await fixture();
  assert.throws(() => verifyDispatchOrigin(f.request, f.receipt, f.parent, f.run, repository, owner, 7), error => error.code === 'workflow-revision-rejected');
  for (const changed of [{ actor: { login: 'stranger' } }, { head_branch: 'other' }, { path: '.github/workflows/other.yml' }, { repository: { full_name: 'other/repo' } }]) {
    assert.throws(() => verifyDispatchOrigin(f.request, f.receipt, f.parent, { ...f.run, ...changed }, repository, owner, 7), error => !error.code);
  }
});

test('confirmed rejected preparation is retryable once without any admitted effects', async () => {
  const f = await fixture();
  const observation = await observeDispatch(f.api, repository, owner, f.comment, f.issue, f.comments, Date.now(), f.readArtifact);
  assert.equal(observation.code, 'workflow-revision-rejected');
  assert.equal(observation.state, 'retryable');
  assert.equal(f.calls.every(call => call.method === 'GET'), true);
});

test('maintenance records one terminal rejection and one linked retry, then verifies current authority before admission', async () => {
  const f = await fixture();
  const retry = await prepareRecovery(f.api, repository, owner, 7, f.maintenance, true, Date.now(), f.readArtifact);
  assert.equal(retry.request.recovery.kind, 'before-admission');
  assert.equal(retry.request.recovery.attempt, 1);
  assert.match(f.comments.at(-1).body, /Retry 1\/1/);
  assert.equal(retry.request.sourceRevision, current);
  assert.equal(retry.request.workflowRevision, current);
  assert.equal(retry.request.routerRevision, current);
  const rejected = readDispatchReceipt(f.comment, repository, 7);
  assert.equal(rejected.status, 'failed');
  assert.equal(rejected.workerRunId, '200');
  assert.equal(rejected.admissionRejected.observedRevision, current);
  assert.deepEqual(retry.request.completionAuthorization, f.request.completionAuthorization);
  assert.equal(f.calls.some(call => call.path.endsWith('/merge') || call.path.endsWith('/dispatches')), false);
  f.artifacts.set(300, retry.request);
  const worker = { ...f.run, id: 400, status: 'in_progress', conclusion: null };
  f.runs.set(400, worker);
  const loaded = await loadDispatch(f.api, repository, owner, 7, retry.commentId, worker, f.readArtifact);
  assert.equal(loaded.request.id, retry.request.id);
  f.issue.labels.push({ name: 'future' });
  await assert.rejects(verifyRecoveryOrigin(f.api, repository, owner, loaded, f.maintenance, f.readArtifact, 0, true), /authority changed/);
  f.issue.labels.pop();
  const second = await prepareRecovery(f.api, repository, owner, 7, f.maintenance, true, Date.now(), f.readArtifact);
  assert.equal(second.request, undefined);
  assert.equal(f.comments.length, 2);
});

test('uncertain effects never authorize recovery or terminal reconciliation', async () => {
  for (const scenario of ['agent-ran', 'publisher-ran', 'missing-job', 'active', 'rerun', 'wrong-worker']) {
    const f = await fixture();
    if (scenario === 'agent-ran') f.jobs.find(job => job.name === 'agent').conclusion = 'success';
    if (scenario === 'publisher-ran') f.jobs.at(-1).conclusion = 'success';
    if (scenario === 'missing-job') f.jobs.pop();
    if (scenario === 'active') f.run.status = 'in_progress';
    if (scenario === 'rerun') f.run.run_attempt = 2;
    if (scenario === 'wrong-worker') { f.receipt.workerRunId = '201'; f.comment.body = dispatchReceiptBody(repository, f.receipt); f.runs.set(201, { ...f.run, head_branch: 'other' }); }
    const result = await prepareRecovery(f.api, repository, owner, 7, f.maintenance, true, Date.now(), f.readArtifact);
    assert.equal(result.request, undefined, scenario);
    assert.equal(f.calls.some(call => call.method !== 'GET'), false, scenario);
  }
});

test('changed criteria, holds, approval, head, policy and workflow ownership stop a confirmed rejection', async () => {
  for (const scenario of ['criteria', 'hold', 'approval', 'approval-text', 'head', 'policy', 'workflow', 'product', 'code', 'unknown-inventory', 'rewritten-history', 'owner-ref', 'missing-binding', 'custom-product']) {
    const f = await fixture();
    if (scenario === 'criteria') f.issue.body += ' Changed acceptance.';
    if (scenario === 'hold') f.issue.labels.push({ name: 'human-working' });
    if (scenario === 'approval') f.reviews.push({ id: 2, user: { login: owner }, state: 'CHANGES_REQUESTED', commit_id: head });
    if (scenario === 'approval-text') f.reviews[0].body = 'Additional acceptance condition.';
    if (scenario === 'head') f.pr.head.sha = 'f'.repeat(40);
    if (scenario === 'policy') f.profile.requiredApprovals = 1;
    if (scenario === 'workflow') f.changed[0].filename = '.github/workflows/lighthouse-sdlc-review.lock.yml';
    if (scenario === 'product') f.changed[0].filename = 'docs/product/model/requirement.md';
    if (scenario === 'code') f.changed[0].filename = 'src/feature.mjs';
    if (scenario === 'unknown-inventory') f.changed.push(...Array.from({ length: 299 }, (_, i) => ({ filename: `docs/${i}.md` })));
    if (scenario === 'owner-ref') f.parent.actor = f.parent.triggering_actor = { login: owner };
    if (scenario === 'missing-binding') delete f.request.admissionBinding;
    if (scenario === 'missing-binding') { f.request.intent = dispatchIntent(f.request); f.receipt.intent = f.request.intent; f.receipt.digest = digest(JSON.stringify(f.request)); f.comment.body = dispatchReceiptBody(repository, f.receipt); }
    if (scenario === 'custom-product') f.changed[0].filename = 'docs/custom/model/requirement.md';
    const api = scenario === 'custom-product' ? async (path, ...args) => path.startsWith('contents/.product/config.yaml?') ? {encoding:'base64',size:26,content:Buffer.from('product-root: docs/custom').toString('base64')} : f.api(path,...args) : scenario === 'rewritten-history' ? async (path, ...args) => path.startsWith('compare/') ? { ...(await f.api(path, ...args)), merge_base_commit: { sha: 'f'.repeat(40) } } : f.api(path, ...args) : f.api;
    const result = await prepareRecovery(api, repository, owner, 7, f.maintenance, true, Date.now(), f.readArtifact);
    assert.equal(result.request, undefined, scenario);
    assert.equal(readDispatchReceipt(f.comment, repository, 7).status, 'failed', scenario);
    assert.equal(f.calls.some(call => call.path.endsWith('/dispatches')), false, scenario);
  }
});

test('disabled recovery observes the rejection without changing receipts', async () => {
  const f = await fixture();
  const result = await prepareRecovery(f.api, repository, owner, 7, f.maintenance, false, Date.now(), f.readArtifact);
  assert.equal(result.observations[0].state, 'retryable');
  assert.equal(result.request, undefined);
  assert.equal(f.calls.every(call => call.method === 'GET'), true);
});


test('the shared worker adapter records a durable rejection before any claim or stage effect', async () => {
  const f = await fixture();
  const env = { LIGHTHOUSE_ISSUE: '7', LIGHTHOUSE_STAGE: 'review', GITHUB_RUN_ID: '200', GITHUB_RUN_ATTEMPT: '1' };
  await assert.rejects(admitDispatch(f.api, repository, owner, env, { inputs: { 'dispatch-request': '30' } }, f.readArtifact), /workflow revision changed before admission/);
  const rejected = readDispatchReceipt(f.comment, repository, 7);
  assert.equal(rejected.status, 'failed');
  assert.equal(rejected.workerRunId, '200');
  assert.equal(rejected.admissionRejected.observedRevision, current);
  assert.match(f.comment.body, /rejected before admission/);
  assert.equal(f.calls.filter(call => call.method !== 'GET').length, 1);
  assert.equal(f.calls.some(call => call.path.endsWith('/dispatches') || call.path.includes('/labels')), false);
});

test('actual router preparation refreshes a bot continuation while retaining an explicit owner workflow branch', async () => {
  const { mkdtemp, writeFile, readFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { spawnSync } = await import('node:child_process');
  for (const actor of ['github-actions[bot]', owner]) {
    const dir = await mkdtemp(join(tmpdir(), 'continuation-router-'));
    try {
      const f = await fixture();
      await writeFile(join(dir, 'event.json'), JSON.stringify(f.request.event));
      // Isolate retained integration lookup; dispatch routing and completion authority use their real adapters.
      await writeFile(join(dir, 'preload.mjs'), `import { registerHooks } from 'node:module';
        registerHooks({load(url, context, next) {
          if (url.endsWith('/integration-evidence.mjs')) return {format:'module', source:'export async function readIntegrationEvidence(){return {authenticated:true};}', shortCircuit:true};
          return next(url, context);
        }});
        const {fixture} = await import('${new URL('./helpers/continuation-admission-fixture.mjs', import.meta.url).href}');
        const f = await fixture();
        f.comments.splice(0, f.comments.length, { ...f.comment, id:10, body:'<!-- lighthouse-pending-review:'+JSON.stringify({schemaVersion:1,repository:'owner/repo',issue:7,pr:8,head:'${head}',merge:'${'d'.repeat(40)}',run:'500',attempt:'1'})+' -->' });
        f.runs.set(500,{...f.parent,id:500,path:'.github/workflows/lighthouse-sdlc-integrate.lock.yml',status:'completed'});
        f.parent.actor = f.parent.triggering_actor = {login:'${actor}'};
        f.parent.head_branch = '${actor === owner ? 'reviewed/workflow' : 'main'}';
        globalThis.fetch = async (url, options) => {
          const path = url.replace('https://api.github.com/repos/owner/repo', '').replace(/^\\//, '');
          const value = await f.api(path, options.method, options.body ? JSON.parse(options.body) : undefined);
          return {ok:true,status:200,json:async()=>value};
        };`);
      const result = spawnSync(process.execPath, ['--import', join(dir, 'preload.mjs'), new URL('../packages/sdlc/src/issue-actions.mjs', import.meta.url).pathname, 'dispatch-prepare'], { encoding: 'utf8', timeout: 20000, env: { ...process.env, GITHUB_REPOSITORY: repository, GITHUB_REPOSITORY_OWNER: owner, GITHUB_ACTOR: actor, GITHUB_TRIGGERING_ACTOR: actor, GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_EVENT_PATH: join(dir, 'event.json'), GITHUB_RUN_ID: '100', GITHUB_RUN_ATTEMPT: '1', GITHUB_OUTPUT: join(dir, 'output'), LIGHTHOUSE_COMPLETION_ENABLED: 'true', LIGHTHOUSE_ISSUE: '7', LIGHTHOUSE_STAGE: 'review', RUNNER_TEMP: dir, GH_TOKEN: 'fixture' } });
      assert.equal(result.status, 0, result.stdout + result.stderr);
      const request = JSON.parse(await readFile(join(dir, 'lighthouse-100-1/dispatch.json'), 'utf8'));
      assert.equal(request.routerRevision, old);
      assert.equal(request.sourceRevision, current);
      assert.equal(request.workflowRevision, actor === owner ? old : current);
      assert.equal(request.ref, actor === owner ? 'reviewed/workflow' : 'main');
      assert.equal(request.completionAuthorization.head, head);
      assert.equal(request.admissionBinding.head, head);
    } finally { await rm(dir, { recursive: true, force: true }); }
  }
});

test('a recovered review admits once and another workflow revision race exhausts its separate one-attempt budget', async () => {
  for (const race of [false, true]) {
    const f = await fixture();
    const retry = await prepareRecovery(f.api, repository, owner, 7, f.maintenance, true, Date.now(), f.readArtifact);
    f.artifacts.set(300, retry.request);
    const worker = { ...f.run, id: 400, head_sha: race ? 'f'.repeat(40) : current };
    f.runs.set(400, worker);
    const env = { LIGHTHOUSE_ISSUE: '7', LIGHTHOUSE_STAGE: 'review', GITHUB_RUN_ID: '400', GITHUB_RUN_ATTEMPT: '1', LIGHTHOUSE_RECOVERY_ENABLED: 'true', LIGHTHOUSE_MAINTENANCE_ISSUES: '[7]' };
    const event = { inputs: { 'dispatch-request': String(retry.commentId) } };
    if (race) {
      await assert.rejects(admitDispatch(f.api, repository, owner, env, event, f.readArtifact), /workflow revision changed/);
      const result = await prepareRecovery(f.api, repository, owner, 7, f.maintenance, true, Date.now(), f.readArtifact);
      assert.equal(result.observations[0].state, 'exhausted');
      assert.equal(result.request, undefined);
    } else {
      assert.equal((await admitDispatch(f.api, repository, owner, env, event, f.readArtifact)).admitted, true);
      assert.equal((await admitDispatch(f.api, repository, owner, env, event, f.readArtifact)).admitted, false);
    }
    assert.equal(f.comments.length, 2);
    assert.equal(f.calls.some(call => call.path.endsWith('/merge') || call.path.endsWith('/dispatches')), false);
  }
});
