import test from 'node:test';
import assert from 'node:assert/strict';
import { deliveryAfterChecks, dispatchDeliveryChecks, completionSource, ciFailureSummary } from '../packages/sdlc/src/delivery-events.mjs';

const head = 'a'.repeat(40), merge = 'c'.repeat(40), repository = 'owner/repo';
const pr = { number: 60, state: 'open', merged: false, draft: false, user: { login: 'github-actions[bot]', type: 'Bot' }, head: { sha: head, ref: `lighthouse/implement-47-${'b'.repeat(12)}`, repo: { full_name: repository } }, base: { ref: 'main', repo: { full_name: repository } }, body: `<!-- lighthouse-implementation:${'b'.repeat(64)} -->`, merge_commit_sha: merge };
const profile = { completion: { postMergeWorkflows: ['verify.yml'] } };
const file = value => ({ content: Buffer.from(JSON.stringify(value)).toString('base64') });
const event = { action: 'completed', workflow_run: { id: 123, head_sha: head } };

test('only current merge-tree CI and current owner head approval can resume integration', async () => {
  const base = 'd'.repeat(40), submitted = { action: 'completed', workflow_run: { id: 123, head_sha: merge } };
  let actual = structuredClone(pr), liveBase = base, parents = [base, head];
  let run = { id: 123, path: '.github/workflows/verify.yml', repository: { full_name: repository }, status: 'completed', conclusion: 'success', event: 'push', head_sha: merge, head_branch: `lighthouse/verification-60-${merge}` };
  let reviews = [{ id: 7, state: 'APPROVED', user: { login: 'owner' }, commit_id: head }];
  const api = async path => {
    if (path === 'actions/runs/123') return run;
    if (path === '') return { default_branch: 'main' };
    if (path.startsWith('contents/')) return file(profile);
    if (path.startsWith('commits/')) return [];
    if (path === 'pulls/60') return actual;
    if (path === 'pulls/61') return null;
    if (path.includes('/reviews?')) return reviews;
    if (path === 'git/ref/heads/main') return { object: { sha: liveBase } };
    if (path.startsWith('compare/')) return { base_commit: { sha: liveBase }, behind_by: 1 };
    if (path === 'git/commits/' + merge) return { sha: merge, parents: parents.map(sha => ({ sha })) };
    throw Error(path);
  };
  assert.equal((await deliveryAfterChecks(api, repository, 'owner', submitted)).head, head);
  assert.equal(await completionSource(api, repository, submitted), 'checks');
  reviews.push({ id: 8, state: 'CHANGES_REQUESTED', user: { login: 'owner' }, commit_id: head });
  assert.equal(await deliveryAfterChecks(api, repository, 'owner', submitted), null);
  reviews = [{ id: 9, state: 'APPROVED', user: { login: 'owner' }, commit_id: merge }];
  assert.equal(await deliveryAfterChecks(api, repository, 'owner', submitted), null);
  reviews[0].commit_id = head;
  for (const changed of [{ conclusion: 'failure' }, { path: '.github/workflows/other.yml' }, { event: 'workflow_dispatch' }, { head_branch: `lighthouse/verification-61-${merge}` }]) {
    const previous = run; run = { ...run, ...changed };
    assert.equal(await deliveryAfterChecks(api, repository, 'owner', submitted), null); run = previous;
  }
  actual.merge_commit_sha = base;
  assert.equal(await deliveryAfterChecks(api, repository, 'owner', submitted), null);
  actual = structuredClone(pr); liveBase = head;
  await assert.rejects(deliveryAfterChecks(api, repository, 'owner', submitted), /current head and base/);
  liveBase = base; parents = [base, 'f'.repeat(40)];
  await assert.rejects(deliveryAfterChecks(api, repository, 'owner', submitted), /current head and base/);
});

test('CI resumes only the current owner-approved bot PR; unrelated, failed and stale runs do nothing', async () => {
  let actual = pr, run = { id: 123, path: '.github/workflows/verify.yml', status: 'completed', conclusion: 'success', event: 'workflow_dispatch', head_sha: head, head_branch: pr.head.ref };
  let reviews = [{ id: 7, state: 'APPROVED', user: { login: 'owner' }, commit_id: head }];
  const api = async path => {
    if (path === 'actions/runs/123') return run;
    if (path === '') return { default_branch: 'main' };
    if (path.startsWith('contents/')) return file(profile);
    if (path.startsWith('commits/')) return [actual];
    if (path.includes('/reviews?')) return reviews;
    assert.equal(path, 'pulls/60'); return actual;
  };
  assert.equal((await deliveryAfterChecks(api, repository, 'owner', event)).stage, 'integrate');
  reviews.push({ id: 8, state: 'CHANGES_REQUESTED', user: { login: 'owner' }, commit_id: head });
  assert.equal(await deliveryAfterChecks(api, repository, 'owner', event), null);
  reviews = [{ id: 9, state: 'APPROVED', user: { login: 'outsider' }, commit_id: head }];
  assert.equal(await deliveryAfterChecks(api, repository, 'owner', event), null);
  reviews = [{ id: 10, state: 'APPROVED', user: { login: 'owner' }, commit_id: merge }];
  assert.equal(await deliveryAfterChecks(api, repository, 'owner', event), null);
  run = { ...run, path: '.github/workflows/unrelated.yml' };
  assert.equal(await deliveryAfterChecks(api, repository, 'owner', event), null);
  run = { ...run, path: '.github/workflows/verify.yml', conclusion: 'failure' };
  assert.equal(await deliveryAfterChecks(api, repository, 'owner', event), null);
  run = { ...run, conclusion: 'success', head_sha: merge, head_branch: 'main' };
  actual = { ...pr, state: 'closed', merged: true };
  assert.equal((await deliveryAfterChecks(api, repository, 'owner', { ...event, workflow_run: { id: 123, head_sha: merge } })).stage, 'review');
});

test('bot publications dispatch adopted CI for the exact branch and refuse a changed head', async () => {
  const writes = []; let changed = false;
  const api = async (path, method, body) => {
    if (method === 'POST') { writes.push({ path, body }); return; }
    if (path.startsWith('contents/')) return file(profile);
    if (path.includes('/runs?')) return { total_count: 0, workflow_runs: [] };
    assert.equal(path, 'pulls/60'); return changed ? { ...pr, head: { ...pr.head, sha: merge } } : pr;
  };
  await dispatchDeliveryChecks(api, head, pr);
  assert.deepEqual(writes, [{ path: 'actions/workflows/verify.yml/dispatches', body: { ref: pr.head.ref } }]);
  changed = true;
  await assert.rejects(dispatchDeliveryChecks(api, head, pr), /changed/);
  assert.equal(writes.length, 1);
});

test('CI launch checkpoints distinguish safe pre-send failure, rejection and unconfirmed effects', async () => {
  const now = Date.parse('2026-01-01T00:00:00Z');
  for (const mode of ['head-read', 'rejected', 'lost-response']) {
    let saved, posts = 0, fail = true, visible = false;
    const api = async (path, method) => {
      if (path.startsWith('contents/')) return file(profile);
      if (path === 'pulls/60') {
        if (mode === 'head-read' && fail) throw Error('Head read unavailable');
        return pr;
      }
      if (path.includes('/runs?')) return { total_count: visible ? 1 : 0, workflow_runs: visible ? [{ id: 123, head_sha: head, head_branch: pr.head.ref, repository: { full_name: repository }, path: '.github/workflows/verify.yml', event: 'workflow_dispatch' }] : [] };
      if (method === 'POST') { posts++; if (fail) throw Object.assign(Error('CI request failed'), { status: mode === 'rejected' ? 403 : 503 }); return null; }
      throw Error(path);
    };
    const checkpoint = async value => { saved = structuredClone(value); };
    await assert.rejects(dispatchDeliveryChecks(api, head, pr, { checkpoint, now }));
    assert.equal(saved[0].state, mode === 'head-read' ? 'not-sent' : mode === 'rejected' ? 'rejected' : 'unknown');
    const original = structuredClone(saved);
    fail = false;
    if (mode === 'lost-response') {
      await assert.rejects(dispatchDeliveryChecks(api, head, pr, { checkpoint, previous: original, now: now + 3600000 }), /unconfirmed/);
      assert.equal(posts, 1, 'absence cannot authorize repeating an uncertain POST');
      visible = true;
      const result = await dispatchDeliveryChecks(api, head, pr, { checkpoint, previous: original, now: now + 3600000 });
      assert.equal(result[0].run, 123); assert.equal(posts, 1, 'already-created CI is reconciled without another write');
    } else {
      await assert.rejects(dispatchDeliveryChecks(api, head, pr, { checkpoint, previous: original, now: now + 1799999 }), /delay/);
      const result = await dispatchDeliveryChecks(api, head, pr, { checkpoint, previous: original, now: now + 1800000 });
      assert.equal(result[0].attempt, 2); assert.equal(result[0].state, 'acknowledged');
      const exhausted = [{ ...original[0], attempt: 3 }];
      await assert.rejects(dispatchDeliveryChecks(api, head, pr, { checkpoint, previous: exhausted, now: now + 3600000 }), /exhausted/);
    }
  }
});

test('reconciling an earlier uncertain CI request preserves later workflow delays and budgets', async () => {
  const now = Date.parse('2026-01-01T01:00:00Z'), observedAt = '2026-01-01T00:00:00Z';
  const previous = ['verify.yml', 'other.yml'].map((workflow, index) => ({ schemaVersion: 1, pr: pr.number, head, branch: pr.head.ref, workflow, attempt: index + 1, state: index ? 'not-sent' : 'unknown', observedAt }));
  let saved;
  const api = async (path, method = 'GET') => {
    assert.equal(method, 'GET');
    if (path.startsWith('contents/')) return file({ completion: { postMergeWorkflows: ['verify.yml', 'other.yml'] } });
    if (path === 'pulls/60') return pr;
    if (path.includes('/runs?')) return { total_count: 0, workflow_runs: [] };
    throw Error(path);
  };
  await assert.rejects(dispatchDeliveryChecks(api, head, pr, { now, previous, checkpoint: async value => { saved = structuredClone(value); } }), /unconfirmed/);
  assert.deepEqual(saved[1], previous[1]);
});


test('recovered completion source requires its actual native maintenance proof', async () => {
  const event = { action: 'completed', workflow_run: { id: 123, head_sha: head }, completionRecovery: { maintenance: 300, issue: 47 } };
  const api = async path => path === 'actions/runs/123' ? { id: 123, head_sha: head, status: 'completed', repository: { full_name: repository } } : { id: 300, actor: { login: 'other' } };
  await assert.rejects(completionSource(api, repository, event), /owner maintenance origin/);
});

test('CI diagnostics retain safe HTTP, timeout and changed-head facts without exception content', async () => {
  for (const mode of ['http', 'timeout', 'head']) {
    let saved, caught;
    const api = async (path, method) => {
      if (path.startsWith('contents/')) return file(profile);
      if (path === 'pulls/60') return mode === 'head' ? { ...pr, state: 'closed' } : pr;
      if (path.includes('/runs?')) return { total_count: 0, workflow_runs: [] };
      assert.equal(method, 'POST');
      throw Object.assign(Error('SECRET response body token=private'), mode === 'http' ? { status: 403, headers: { authorization: 'SECRET' } } : { name: 'TimeoutError' });
    };
    try { await dispatchDeliveryChecks(api, head, pr, { checkpoint: async rows => { saved = structuredClone(rows); } }); } catch (error) { caught = error; }
    const failure = saved[0].error;
    assert.deepEqual(failure, caught.ciRequestFailure);
    assert.equal(failure.pr, 60); assert.equal(failure.head, head);
    assert.equal(failure.method, mode === 'head' ? 'GET' : 'POST');
    assert.equal(failure.path, mode === 'head' ? 'pulls/60' : 'actions/workflows/verify.yml/dispatches');
    assert.equal(failure.status, mode === 'http' ? 403 : null);
    assert.equal(failure.code, mode === 'head' ? 'head-changed' : 'request-failed');
    assert.equal(saved[0].state, mode === 'http' ? 'rejected' : mode === 'head' ? 'not-sent' : 'unknown');
    assert.doesNotMatch(JSON.stringify(failure) + ciFailureSummary(failure), /SECRET|private|response body|authorization/);
    assert.match(ciFailureSummary(failure), /Maintainer: reconcile/);
  }
});
