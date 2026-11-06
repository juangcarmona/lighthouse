import test from 'node:test';
import assert from 'node:assert/strict';
import { checkPublication, checkImplementationPrInventory, taskDigest } from '../packages/sdlc/src/issue-actions.mjs';
import { createImplementationPullRequest, observeImplementationPublication } from '../packages/sdlc/src/implementation.mjs';
import { dispatchDeliveryChecks } from '../packages/sdlc/src/delivery-events.mjs';
import { checkReviewCurrent, loadProposalReview, checkAlignedImplementationPullRequest } from '../packages/sdlc/src/proposal-review.mjs';
import { checkProductResumePullRequest } from '../packages/sdlc/src/product-change.mjs';
import { digest } from '../packages/sdlc/src/host-contract.mjs';

const repository = 'owner/repo', base = 'a'.repeat(40), head = 'b'.repeat(40), runId = 'c'.repeat(64);
function fixture(epic = false) {
  const issue = { title: 'Bounded summary', body: 'Classify the supplied observations.', state: 'open', labels: [{ name: 'agent-working' }] };
  const snapshot = { issue: 18, repository, title: issue.title, runId, sourceRevision: base, defaultBranch: 'main', taskDigest: taskDigest(issue, []), implementation: { policy: { scope: 'Only the summary', paths: ['src/'], checks: [['npm', 'test']], reviewRequired: false } } };
  if (epic) snapshot.epic = { parent: 146, base: 'lighthouse/epic-146', baseSha: base };
  const f = { issue, snapshot, pulls: [], pushes: [], requests: [], source: base, reference: null, published: null, baseReference: base };
  f.check = async () => {
    checkPublication(snapshot, issue, [], f.source);
    const published = { publishedHead: f.published?.head.sha };
    if (snapshot.implementationReview) {
      if (snapshot.productResume) {
        if (digest(JSON.stringify(await f.api(snapshot.implementationReview.path))) !== snapshot.implementationReview.feedbackDigest) throw Error('Review feedback changed');
      } else await checkReviewCurrent(f.api, repository, snapshot.implementationReview, true, published);
    }
    if (snapshot.productResume) checkProductResumePullRequest(await f.api('pulls/7'), repository, snapshot.productResume, published);
    if (snapshot.productAlignment) checkAlignedImplementationPullRequest(await f.api('pulls/7'), repository, snapshot.productAlignment, published);
    checkImplementationPrInventory(f.pulls, snapshot, f.published, f.published ? (await f.api(`git/ref/heads/${snapshot.epic?.base ?? snapshot.defaultBranch}`))?.object?.sha : undefined);
  };
  f.api = async (path, method = 'GET', body) => {
    if (path === 'pulls' && method === 'POST') {
      const pr = { id: 700, number: 7, state: 'open', merged: false, draft: body.draft, body: body.body, user: { login: 'github-actions[bot]', type: 'Bot' }, head: { sha: head, ref: body.head, repo: { full_name: repository } }, base: { sha: base, ref: body.base, repo: { full_name: repository } } };
      f.pulls.push(pr); return structuredClone(pr);
    }
    if (path === 'pulls/7') return structuredClone(f.pulls[0]);
    if (path.startsWith('git/ref/heads/lighthouse/implement-')) return { object: { sha: f.pulls[0].head.sha } };
    if (path.startsWith('git/commits/') && method === 'GET') return { tree: { sha: base } };
    if (path === 'git/ref/heads/main' || path === 'git/ref/heads/lighthouse/epic-146') return { object: { sha: f.baseReference } };
    if (path.startsWith('compare/')) return { base_commit: { sha: f.baseReference }, behind_by: 0 };
    if (path === 'git/commits' && method === 'POST') return { sha: head };
    if (path.startsWith('git/') && method === 'POST') return { sha: base };
    if (path.startsWith('contents/.lighthouse/github.json?')) return { content: Buffer.from(JSON.stringify({ completion: { postMergeWorkflows: ['ci.yml'] } })).toString('base64') };
    if (path.startsWith('contents/.github/workflows/ci.yml?')) return { type: 'file', sha: base };
    if (path.startsWith('actions/workflows/ci.yml/runs?')) return { total_count: f.requests.length, workflow_runs: f.requests };
    if (path.startsWith('git/ref/heads/lighthouse/verification-7-')) return f.reference;
    throw Error(`Unexpected ${method} ${path}`);
  };
  f.publish = async () => {
    const result = await createImplementationPullRequest(f.api, snapshot, [{ path: 'src/summary.mjs', mode: '100644', content: Buffer.from('export const summary = 1;').toString('base64') }], 'Candidate', '', true, f.check);
    f.published = await observeImplementationPublication(f.api, snapshot, result, async () => {});
    assert.equal(f.published.head.sha, result.head.sha);
  };
  f.start = () => dispatchDeliveryChecks(f.api, base, f.published, { beforeWrite: f.check, ciTrigger: async input => {
    await input.beforeWrite(); f.pushes.push(input.head);
    f.reference = { ref: `refs/heads/${input.branch}`, object: { sha: input.head } };
    f.requests.push({ id: 50, head_sha: input.head, head_branch: input.branch, path: '.github/workflows/ci.yml', event: 'push', repository: { full_name: repository } });
  } });
  return f;
}

async function updateFixture(role) {
  const f = fixture(), prior = 'd'.repeat(40), originalRun = 'e'.repeat(64), branch = `lighthouse/implement-18-${originalRun.slice(0, 12)}`;
  const current = { id: 700, number: 7, state: 'open', merged: false, draft: true, user: { login: 'github-actions[bot]', type: 'Bot' }, head: { sha: prior, ref: branch, repo: { full_name: repository } }, base: { sha: base, ref: 'main', repo: { full_name: repository } }, html_url: 'https://github.com/owner/repo/pull/7', body: `Original evidence.\n<!-- lighthouse-implementation:${originalRun} -->` };
  f.pulls.push(current); f.snapshot.sourceRevision = prior; f.snapshot.baseRevision = base;
  f.feedback = { id: 100, user: { login: 'owner', type: 'User' }, body: 'Preserve the contract and correct the boundary.', issue_url: `https://api.github.com/repos/${repository}/issues/7`, html_url: 'https://github.com/owner/repo/pull/7#issuecomment-100' };
  const originalApi = f.api;
  f.api = async (path, method = 'GET', body) => {
    if (path === `git/refs/heads/${branch}` && method === 'PATCH') { current.head.sha = body.sha; return {}; }
    if (path === 'pulls/7' && method === 'PATCH') { current.body = body.body; return structuredClone(current); }
    if (path === 'issues/comments/100') return structuredClone(f.feedback);
    if (path.startsWith('issues/7/comments?')) return [structuredClone(f.feedback)];
    if (path.startsWith('pulls/7/comments?') || path.startsWith('pulls/7/reviews?')) return [];
    return originalApi(path, method, body);
  };
  if (['review', 'product-review'].includes(role)) {
    f.snapshot.implementationReview = await loadProposalReview(f.api, repository, 'owner', { action: 'created', issue: { number: 7, pull_request: {} }, comment: { id: 100 } }, 'issue_comment', true);
  }
  if (role === 'aligned') {
    f.snapshot.productAlignment = { defaultBranch: 'main', parent: { issue: 18, stage: 'implement', pullRequest: { number: 7, branch, head: prior } } };
  } else if (role !== 'review') {
    const intent = 'f'.repeat(64), parent = { issue: 18, stage: 'implement', predecessor: { runId: '200', attempt: 1 }, gap: { summary: 'Missing intent', scope: 'Issue scope' }, sourceRevision: base, baseRevision: base, taskDigest: f.snapshot.taskDigest, autoImplement: false };
    const checkpoint = { schemaVersion: 1, kind: 'checkpoint', identity: { repository, issue: 18, parentRunId: '200', authorizationDigest: '1'.repeat(64), policyDigest: '2'.repeat(64), workflowRevision: '3'.repeat(40), head: prior }, requestDigest: '4'.repeat(64), changeName: 'example', changeId: 'CHG-EXAMPLE', proposalDigest: '5'.repeat(64), baselineDigest: '6'.repeat(64), state: 'applied', effectIds: [`apply:${intent}:${prior}`], parent };
    current.body = `Product decision retained.\n<!-- lighthouse-product-change:{"changeId":"CHG-EXAMPLE"} -->\n<!-- lighthouse-product-change-checkpoint:${JSON.stringify(checkpoint)} -->`;
    f.snapshot.productResume = { issue: 18, parent, pullRequest: 7, head: prior, branch, receiptIntent: intent };
  }
  return f;
}

test('a fresh published implementation can start trusted head CI through its original authority guard', async () => {
  for (const epic of [false, true]) {
    const f = fixture(epic); await f.publish();
    assert.equal(f.pulls.length, 1);
    const requests = await f.start();
    assert.deepEqual(f.pushes, [head]);
    assert.equal(requests[0].state, 'observed');
    assert.equal(f.pulls.length, 1);
  }
});

test('publication does not admit competing PRs, changed candidates or revoked owner authority', async () => {
  for (const mutate of [
    f => { f.pulls.push({ ...structuredClone(f.pulls[0]), id: 701, number: 8 }); },
    f => { f.pulls[0].id++; },
    f => { f.pulls[0].head.sha = base; },
    f => { f.pulls[0].base.ref = 'other'; },
    f => { f.baseReference = head; },
    f => { f.pulls[0].head.repo.full_name = 'other/repo'; },
    f => { f.pulls[0].body = ''; },
    f => { f.pulls[0].merged = true; f.pulls[0].state = 'closed'; },
    f => { f.pulls.length = 0; },
    f => { f.issue.labels = [{ name: 'human-working' }]; },
    f => { f.issue.body += 'Changed intent'; },
    f => { f.source = head; },
  ]) {
    const f = fixture(); await f.publish(); mutate(f);
    await assert.rejects(f.start());
    assert.equal(f.pushes.length, 0);
  }
});

test('review corrections, product apply and aligned resumptions start CI for the new validated head on the same PR', async t => {
  for (const role of ['review', 'product', 'product-review', 'aligned']) {
    await t.test(role, async () => {
      const f = await updateFixture(role); await f.publish();
      assert.equal(f.pulls.length, 1);
      assert.equal(f.published.head.sha, head);
      const requests = await f.start();
      assert.deepEqual(f.pushes, [head]);
      assert.equal(requests[0].state, 'observed');
      assert.equal(f.pulls.length, 1);
    });
  }
});

test('post-publication bindings never relax original head checks before publication', async () => {
  for (const role of ['review', 'product', 'product-review', 'aligned']) {
    const f = await updateFixture(role);
    f.pulls[0].head.sha = '9'.repeat(40);
    await assert.rejects(f.publish(), /changed/);
    assert.equal(f.published, null);
    assert.equal(f.pulls[0].head.sha, '9'.repeat(40));
    assert.equal(f.pushes.length, 0);
  }
});

test('updated publications reject competing PRs, changed identity and revoked intent before App push', async () => {
  for (const role of ['review', 'product', 'product-review', 'aligned']) {
    for (const mutate of [
      f => { f.pulls.push({ ...structuredClone(f.pulls[0]), id: 701, number: 8 }); },
      f => { f.pulls[0].id++; },
      f => { f.pulls[0].head.sha = base; },
      f => { f.baseReference = head; },
      f => { f.pulls[0].base.ref = 'other'; },
      f => { f.pulls[0].state = 'closed'; },
      f => { f.pulls[0].head.repo.full_name = 'other/repo'; },
      f => { f.issue.body += ' Changed intent'; },
      f => { f.issue.labels = [{ name: 'human-working' }]; },
      f => { f.source = head; },
    ]) {
      const f = await updateFixture(role); await f.publish(); mutate(f);
      await assert.rejects(f.start());
      assert.equal(f.pushes.length, 0);
    }
  }
});

test('edited feedback or applied checkpoints cannot authorize a published continuation', async () => {
  const review = await updateFixture('review'); await review.publish();
  review.feedback.body = 'Do not continue.';
  await assert.rejects(review.start(), /feedback changed/);
  assert.equal(review.pushes.length, 0);
  for (const field of ['head', 'parent']) {
    const f = await updateFixture('product'); await f.publish();
    const marker = f.pulls[0].body.match(/<!-- lighthouse-product-change-checkpoint:(\{[^\n]*\}) -->/)[1];
    const checkpoint = JSON.parse(marker);
    if (field === 'head') checkpoint.identity.head = '9'.repeat(40);
    else checkpoint.parent.gap.scope = 'Changed product scope';
    f.pulls[0].body = f.pulls[0].body.replace(marker, JSON.stringify(checkpoint));
    await assert.rejects(f.start(), /checkpoint changed/);
    assert.equal(f.pushes.length, 0);
  }
});

test('a lost publication readback cannot cause another PR or CI push', async () => {
  const f = fixture(), api = f.api;
  f.api = async (path, ...args) => { if (path === 'pulls/7') throw Error('Readback unavailable'); return api(path, ...args); };
  await assert.rejects(f.publish(), /Readback unavailable/);
  assert.equal(f.pulls.length, 1);
  assert.equal(f.published, null);
  await assert.rejects(f.publish(), /Existing implementation PR/);
  assert.equal(f.pulls.length, 1);
  assert.equal(f.pushes.length, 0);
});


test('implementation publication waits only for its known old head before starting CI once', async () => {
  for (const role of ['review', 'product', 'product-review', 'aligned']) {
    for (const scenario of ['delayed', 'never', 'foreign-head', 'stale-base-snapshot', 'refreshed-base-snapshot', 'foreign-base', 'missing-base-ref', 'malformed-base-snapshot', 'foreign-repo', 'foreign-base-repo', 'foreign-base-branch', 'foreign-number', 'foreign-branch', 'moved-ref', 'closed']) {
      const f = await updateFixture(role), original = f.api, previous = f.snapshot.sourceRevision;
      let writes = 0, reads = 0;
      f.api = async (path, method = 'GET', body) => {
        if (path.startsWith('git/refs/heads/') && method === 'PATCH') writes++;
        if (path === 'git/ref/heads/main') return scenario === 'missing-base-ref' ? null : { object: { sha: scenario === 'foreign-base' ? previous : base } };
        if (path === `git/ref/heads/${f.pulls[0].head.ref}`) return { object: { sha: scenario === 'moved-ref' ? base : head } };
        const value = await original(path, method, body);
        if (path === 'pulls/7' && method === 'GET' && writes) {
          reads++;
          if (scenario === 'never' || scenario === 'delayed' && reads <= 2) value.head.sha = previous;
          if (scenario === 'foreign-head') value.head.sha = base;
          if (scenario === 'stale-base-snapshot' || scenario === 'refreshed-base-snapshot' && reads <= 2) value.base.sha = previous;
          if (scenario === 'malformed-base-snapshot') value.base.sha = 'invalid';
          if (scenario === 'foreign-repo') value.head.repo.full_name = 'other/repo';
          if (scenario === 'foreign-base-repo') value.base.repo.full_name = 'other/repo';
          if (scenario === 'foreign-base-branch') value.base.ref = 'other';
          if (scenario === 'foreign-number') value.number = 8;
          if (scenario === 'foreign-branch') value.head.ref = 'other';
          if (scenario === 'closed') { value.state = 'closed'; value.merged = true; }
        }
        return value;
      };
      const publishAndStart = async () => { await f.publish(); return f.start(); };
      if (['delayed', 'stale-base-snapshot', 'refreshed-base-snapshot'].includes(scenario)) {
        const requests = await publishAndStart(); assert.equal(requests[0].state, 'observed');
        assert.deepEqual(f.pushes, [head]); if (scenario === 'delayed') assert.ok(reads >= 3);
      } else { await assert.rejects(publishAndStart()); assert.deepEqual(f.pushes, []); }
      assert.equal(writes, 1); assert.equal(f.pulls.length, 1);
      assert.ok(reads <= 25);
    }
  }
});


test('fresh ordinary and epic publications accept old PR base snapshots only with the admitted live target', async () => {
  for (const epic of [false, true]) {
    const f = fixture(epic), api = f.api;
    f.api = async (path, ...args) => {
      const value = await api(path, ...args);
      if (path === 'pulls/7' && (!args[0] || args[0] === 'GET')) value.base.sha = '9'.repeat(40);
      return value;
    };
    await f.publish();
    const requests = await f.start();
    assert.ok(requests.every(row => row.state === 'observed' && row.base === base));
    assert.deepEqual(f.pushes, [head]);
    f.baseReference = head;
    await assert.rejects(f.check(), /identity changed/);
    assert.deepEqual(f.pushes, [head]);
  }
});
