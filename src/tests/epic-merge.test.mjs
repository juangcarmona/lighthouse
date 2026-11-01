import test from 'node:test';
import assert from 'node:assert/strict';
import { observeEpicMerge, mergeEpicChild } from '../packages/sdlc/src/epic-merge.mjs';
import { epicCorrelation } from '../packages/sdlc/src/epic-github.mjs';

const base = 'a'.repeat(40), head = 'b'.repeat(40), merge = 'c'.repeat(40), marker = 'd'.repeat(64);
function fixture() {
  const epic = { parent: 146, slice: 'first', planDigest: 'e'.repeat(64), base: 'lighthouse/epic-146', sourceRevision: 'f'.repeat(40) };
  const decision = { pr: 7, review: 9, head, base };
  const pr = { number: 7, state: 'open', merged: false, draft: false, mergeable: true, merge_commit_sha: merge, user: { login: 'github-actions[bot]', type: 'Bot' }, head: { ref: `lighthouse/implement-18-${marker.slice(0, 12)}`, sha: head, repo: { full_name: 'owner/repo' } }, base: { ref: epic.base, repo: { full_name: 'owner/repo' } }, body: `<!-- lighthouse-implementation:${marker} -->` };
  const review = { id: 9, user: { login: 'owner', type: 'User' }, state: 'APPROVED', commit_id: head };
  const data = { branch: { ref: `refs/heads/${epic.base}`, object: { sha: base } }, pr, merge: { parents: [{ sha: base }, { sha: head }] }, reviews: [review], checks: [{ id: 1, name: 'ci', head_sha: merge, status: 'completed', conclusion: 'success', app: { id: 42 } }] };
  const api = async path => {
    if (path === `git/ref/heads/${epic.base}`) return data.branch;
    if (path === 'pulls/7') return data.pr;
    if (path === `git/commits/${merge}`) return data.merge;
    if (path.startsWith('pulls/7/reviews?')) return data.reviews;
    if (path.startsWith(`commits/${merge}/check-runs?`)) return { check_runs: data.checks };
    if (path.startsWith(`commits/${merge}/statuses?`)) return [];
    throw Error(`Unexpected ${path}`);
  };
  const options = { authenticateChild: async () => epic, authenticatePullRequest: async () => true, authorizeDecision: async () => true, loadPolicy: async () => ({ checks: [{ context: 'ci', app: 42 }] }) };
  return { epic, decision, data, api, options, run: () => observeEpicMerge(api, { repository: 'owner/repo', owner: 'owner', child: 18, epic, decision }, options) };
}

test('epic merge observation binds owner review and required checks to exact child head and base', async () => {
  const f = fixture();
  const observed = await f.run();
  assert.equal(observed.mergeCandidate, merge);
  assert.equal(observed.review, 9);
  assert.equal(observed.checks[0].status, 'passed');
});

test('epic merge observation refuses stale, unauthenticated or incomplete evidence', async () => {
  for (const mutate of [
    f => { f.options.authorizeDecision = async () => false; },
    f => { f.options.authenticateChild = async () => ({ ...f.epic, parent: 147 }); },
    f => { f.options.authenticatePullRequest = async () => false; },
    f => { f.data.branch.object.sha = head; },
    f => { f.data.pr.draft = true; },
    f => { f.data.merge.parents[0].sha = head; },
    f => { f.data.reviews.push({ ...f.data.reviews[0], id: 10, state: 'CHANGES_REQUESTED' }); },
    f => { f.data.reviews[0].commit_id = base; },
    f => { f.data.checks[0].conclusion = 'failure'; },
    f => { f.options.loadPolicy = async () => ({ checks: [] }); },
  ]) {
    const f = fixture(); mutate(f);
    await assert.rejects(f.run());
  }
});

test('epic merge observation notices an owner objection added while checks are read', async () => {
  const f = fixture(); let reads = 0;
  const api = async path => {
    if (path.startsWith('pulls/7/reviews?') && ++reads === 2) f.data.reviews.push({ ...f.data.reviews[0], id: 10, state: 'CHANGES_REQUESTED' });
    return f.api(path);
  };
  await assert.rejects(observeEpicMerge(api, { repository: 'owner/repo', owner: 'owner', child: 18, epic: f.epic, decision: f.decision }, f.options), /changed while checking/);
});

test('epic merge records intent and reconciles a lost response without merging twice', async () => {
  for (const loseResponse of [false, true]) {
    const correlation = epicCorrelation({ repository: 'owner/repo', parent: 146, slice: 'first', planDigest: 'e'.repeat(64), base: 'lighthouse/epic-146', dependencies: [], kind: 'pull-request' });
    const resource = { id: 77, number: 7 }, actual = '1'.repeat(40), tree = '2'.repeat(40), events = [];
    let receipt = { schemaVersion: 1, state: 'linked', correlation, resource, publication: { run: '100', attempt: 1, head } }, merged = false;
    const journal = { readReceipt: async () => structuredClone(receipt), writeReceipt: async (_key, value) => { receipt = structuredClone(value); events.push(value.state); } };
    const observed = { child: 18, parent: 146, slice: 'first', planDigest: correlation.planDigest, pr: 7, head, base, mergeCandidate: merge, review: 9, checks: [{ status: 'passed' }] };
    const api = async (path, method = 'GET') => {
      if (path === 'pulls/7/merge' && method === 'PUT') { events.push('put'); merged = true; if (loseResponse) throw Error('response lost'); return { merged: true, sha: actual }; }
      if (path === 'pulls/7') return { ...resource, merged, head: { sha: head, repo: { full_name: 'owner/repo' } }, base: { ref: correlation.base, repo: { full_name: 'owner/repo' } }, merge_commit_sha: actual, merged_by: { login: 'github-actions[bot]', type: 'Bot' } };
      if (path === `git/commits/${actual}`) return { parents: [{ sha: base }], tree: { sha: tree } };
      if (path === `git/commits/${merge}`) return { tree: { sha: tree } };
      throw Error(`Unexpected ${path}`);
    };
    const options = { journal, observe: async () => observed, authorize: async () => true, verifyChecks: async () => true };
    const first = await mergeEpicChild(api, { correlation, resource }, options);
    assert.equal(first.commit, actual);
    assert.equal(first.recovered, loseResponse);
    assert.deepEqual(events, ['merging', 'put', 'accepted']);
    assert.equal((await mergeEpicChild(api, { correlation, resource }, options)).recovered, true);
    assert.equal(events.filter(event => event === 'put').length, 1);
  }
});

test('an uncertain epic merge is never repeated and stale evidence never reaches GitHub', async () => {
  const correlation = epicCorrelation({ repository: 'owner/repo', parent: 146, slice: 'first', planDigest: 'e'.repeat(64), base: 'lighthouse/epic-146', dependencies: [], kind: 'pull-request' });
  const resource = { id: 77, number: 7 }, mergeBinding = { head, base, candidate: merge, review: 9 };
  let receipt = { schemaVersion: 1, state: 'merging', correlation, resource, publication: { run: '100', attempt: 1, head }, merge: mergeBinding }, puts = 0;
  const journal = { readReceipt: async () => structuredClone(receipt), writeReceipt: async (_key, value) => { receipt = structuredClone(value); } };
  const api = async (path, method = 'GET') => { if (method === 'PUT') puts++; return { ...resource, merged: false }; };
  const observed = { parent: 146, slice: 'first', planDigest: correlation.planDigest, pr: 7, head, base, mergeCandidate: merge, review: 9 };
  await assert.rejects(mergeEpicChild(api, { correlation, resource }, { journal, observe: async () => observed, authorize: async () => true, verifyChecks: async () => true }), /unconfirmed/);
  assert.equal(puts, 0);
  receipt = { schemaVersion: 1, state: 'linked', correlation, resource, publication: { run: '100', attempt: 1, head } };
  let reads = 0;
  await assert.rejects(mergeEpicChild(api, { correlation, resource }, { journal, observe: async () => ({ ...observed, base: ++reads === 1 ? base : head }), authorize: async () => true, verifyChecks: async () => true }), /evidence changed/);
  assert.equal(puts, 0);
});

test('a merge performed against a different base is left uncertain', async () => {
  const correlation = epicCorrelation({ repository: 'owner/repo', parent: 146, slice: 'first', planDigest: 'e'.repeat(64), base: 'lighthouse/epic-146', dependencies: [], kind: 'pull-request' });
  const resource = { id: 77, number: 7 }, actual = '1'.repeat(40), tree = '2'.repeat(40);
  let receipt = { schemaVersion: 1, state: 'linked', correlation, resource, publication: { run: '100', attempt: 1, head } };
  const journal = { readReceipt: async () => structuredClone(receipt), writeReceipt: async (_key, value) => { receipt = structuredClone(value); } };
  const observed = { parent: 146, slice: 'first', planDigest: correlation.planDigest, pr: 7, head, base, mergeCandidate: merge, review: 9 };
  const api = async (path, method = 'GET') => {
    if (path === 'pulls/7/merge' && method === 'PUT') return { merged: true, sha: actual };
    if (path === 'pulls/7') return { ...resource, merged: true, head: { sha: head, repo: { full_name: 'owner/repo' } }, base: { ref: correlation.base, repo: { full_name: 'owner/repo' } }, merge_commit_sha: actual, merged_by: { login: 'github-actions[bot]', type: 'Bot' } };
    if (path === `git/commits/${actual}`) return { parents: [{ sha: '3'.repeat(40) }], tree: { sha: tree } };
    if (path === `git/commits/${merge}`) return { tree: { sha: tree } };
    throw Error(`Unexpected ${path}`);
  };
  await assert.rejects(mergeEpicChild(api, { correlation, resource }, { journal, observe: async () => observed, authorize: async () => true, verifyChecks: async () => true }), /does not match the approved base/);
  assert.equal(receipt.state, 'merging');
});

test('authority revoked after a merge leaves the receipt uncertain', async () => {
  const correlation = epicCorrelation({ repository: 'owner/repo', parent: 146, slice: 'first', planDigest: 'e'.repeat(64), base: 'lighthouse/epic-146', dependencies: [], kind: 'pull-request' });
  const resource = { id: 77, number: 7 }, actual = '1'.repeat(40), tree = '2'.repeat(40);
  let receipt = { schemaVersion: 1, state: 'linked', correlation, resource, publication: { run: '100', attempt: 1, head } }, authorizations = 0;
  const journal = { readReceipt: async () => structuredClone(receipt), writeReceipt: async (_key, value) => { receipt = structuredClone(value); } };
  const observed = { parent: 146, slice: 'first', planDigest: correlation.planDigest, pr: 7, head, base, mergeCandidate: merge, review: 9 };
  const api = async (path, method = 'GET') => {
    if (path === 'pulls/7/merge' && method === 'PUT') return { merged: true, sha: actual };
    if (path === 'pulls/7') return { ...resource, merged: true, head: { sha: head, repo: { full_name: 'owner/repo' } }, base: { ref: correlation.base, repo: { full_name: 'owner/repo' } }, merge_commit_sha: actual, merged_by: { login: 'github-actions[bot]', type: 'Bot' } };
    if (path === `git/commits/${actual}`) return { parents: [{ sha: base }], tree: { sha: tree } };
    if (path === `git/commits/${merge}`) return { tree: { sha: tree } };
    throw Error(`Unexpected ${path}`);
  };
  await assert.rejects(mergeEpicChild(api, { correlation, resource }, { journal, observe: async () => observed, authorize: async () => ++authorizations < 3, verifyChecks: async () => true }), /authority or checks/);
  assert.equal(receipt.state, 'merging');
});
