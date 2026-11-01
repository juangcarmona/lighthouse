import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectEpicDependencies } from '../packages/sdlc/src/epic-native.mjs';
import { epicCorrelation, epicMarker } from '../packages/sdlc/src/epic-github.mjs';

const repository = 'owner/repo', owner = 'owner', planDigest = 'a'.repeat(64), baseSha = 'b'.repeat(40), head = 'c'.repeat(40), priorBase = 'd'.repeat(40), candidate = 'e'.repeat(40), commit = 'f'.repeat(40), tree = '1'.repeat(40);
function fixture() {
  const current = { parent: 146, slice: 'second', planDigest, base: 'lighthouse/epic-146', sourceRevision: '2'.repeat(40) };
  const marker = epicCorrelation({ repository, parent: 146, slice: 'second', planDigest, base: current.base, dependencies: ['first'] });
  const priorMarker = epicCorrelation({ repository, parent: 146, slice: 'first', planDigest, base: current.base, dependencies: [] });
  const prior = { id: 101, number: 10, state: 'closed', body: epicMarker(priorMarker) };
  const receipt = { state: 'accepted', resource: { id: 200, number: 20 }, publication: { run: '100', attempt: 1, head }, merge: { head, base: priorBase, candidate, review: 5, commit } };
  const pr = { id: 200, merged: true, user: { login: 'github-actions[bot]', type: 'Bot' }, head: { sha: head, repo: { full_name: repository } }, base: { ref: current.base, repo: { full_name: repository } }, merge_commit_sha: commit, merged_by: { login: 'github-actions[bot]', type: 'Bot' } };
  const review = { id: 5, user: { login: owner, type: 'User' }, state: 'APPROVED', commit_id: head };
  const data = { prior, receipt, pr, reviews: [review], native: [{ id: 101 }], comparison: { status: 'ahead', merge_base_commit: { sha: commit } }, actual: { parents: [{ sha: priorBase }], tree: { sha: tree } }, candidate: { tree: { sha: tree } } };
  const api = async path => {
    if (path === 'issues/11') return { body: epicMarker(marker) };
    if (path === `git/ref/heads/${current.base}`) return { ref: `refs/heads/${current.base}`, object: { sha: baseSha } };
    if (path === '') return { default_branch: 'main' };
    if (path === 'pulls/20') return data.pr;
    if (path === `git/commits/${commit}`) return data.actual;
    if (path === `git/commits/${candidate}`) return data.candidate;
    if (path.startsWith(`commits/${candidate}/check-runs?`)) return { check_runs: [{ id: 1, name: 'ci', head_sha: candidate, status: 'completed', conclusion: 'success', app: { id: 42 } }] };
    if (path.startsWith(`commits/${candidate}/statuses?`)) return [];
    if (path.startsWith('pulls/20/reviews?')) return data.reviews;
    if (path === `compare/${commit}...${baseSha}`) return data.comparison;
    if (path.startsWith('issues/11/dependencies/blocked_by?')) return data.native;
    throw Error(`Unexpected ${path}`);
  };
  const args = { api, repository, owner, child: 11, current, loadPolicy: async () => ({ checks: [{ context: 'ci', app: 42 }] }), findCandidates: async () => [data.prior], authenticate: async input => input.child === 11 ? current : { ...current, slice: 'first' }, readReceipt: async () => data.receipt };
  return { current, args, data, run: () => inspectEpicDependencies(args) };
}

test('dependency acceptance requires a retained merge in the current epic history', async () => {
  const f = fixture();
  assert.deepEqual(await f.run(), { baseSha });
});

test('dependency admission stops for incomplete, changed or unverified evidence', async () => {
  for (const mutate of [
    f => { f.data.prior.state = 'open'; },
    f => { f.args.findCandidates = async () => []; },
    f => { f.args.authenticate = async () => ({ ...f.current, slice: 'other' }); },
    f => { f.data.pr.head.sha = baseSha; },
    f => { f.data.actual.parents[0].sha = baseSha; },
    f => { f.data.reviews.push({ ...f.data.reviews[0], id: 6, state: 'CHANGES_REQUESTED' }); },
    f => { f.data.comparison.status = 'diverged'; },
    f => { f.args.loadPolicy = async () => ({ checks: [] }); },
    f => { f.data.native.push({ id: 999 }); },
    f => { f.args.readReceipt = async () => { throw Error('artifact expired'); }; },
  ]) {
    const f = fixture(); mutate(f);
    await assert.rejects(f.run());
  }
});
