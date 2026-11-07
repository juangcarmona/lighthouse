import test from 'node:test';
import assert from 'node:assert/strict';
import { createImplementationPullRequest } from '../packages/sdlc/src/implementation.mjs';
import { digest } from '../packages/sdlc/src/host-contract.mjs';
import { observeVerificationMerge } from '../packages/sdlc/src/ci-subject.mjs';

const sha = letter => letter.repeat(40);
function fixture(scenario = 'stale') {
  const head = sha('a'), base = sha('b'), oldBase = sha('c'), tree = sha('d'), merge = sha('e'), refreshed = sha('f');
  const marker = 'a'.repeat(64), repository = 'owner/repo', branch = 'lighthouse/implement-18-aaaaaaaaaaaa';
  const feedback = { body: 'Revalidate and refresh verification when the base advanced.', user: { login: 'owner', type: 'User' } };
  const pr = { number: 34, state: 'open', merged: false, mergeable_state: 'behind', merge_commit_sha: merge, user: { login: 'github-actions[bot]', type: 'Bot' }, head: { sha: head, ref: branch, repo: { full_name: repository } }, base: { ref: 'main', repo: { full_name: repository } }, body: `<!-- lighthouse-implementation:${marker} -->` };
  const review = { number: 34, issue: 18, head, branch, base: 'main', implementationIdentity: marker, path: 'issues/comments/10', feedbackDigest: digest(JSON.stringify(feedback)), approved: false };
  const snapshot = { repository, issue: 18, runId: marker, stage: 'implement', worker: 'apply-review', sourceRevision: head, baseRevision: base, defaultBranch: 'main', implementationReview: review, implementation: { policy: { paths: ['src/'], checks: [['npm', 'test']] } } };
  const calls = [];
  const api = async (path, method = 'GET', body) => {
    calls.push({ path, method, body });
    if (path === 'pulls/34') { if (method === 'PATCH') pr.body = body.body; return structuredClone(pr); }
    if (path === review.path) return scenario === 'feedback' ? { ...feedback, body: 'Stop' } : feedback;
    if (path === 'git/ref/heads/main') return { object: { sha: scenario === 'base' ? oldBase : base } };
    if (path === `git/commits/${merge}`) return { sha: merge, parents: [{ sha: scenario === 'current' ? base : oldBase }, { sha: scenario === 'wrong-parent' ? sha('9') : head }] };
    if (path === `compare/${oldBase}...${base}`) return { base_commit: { sha: oldBase }, status: scenario === 'unrelated' ? 'diverged' : 'ahead', behind_by: scenario === 'unrelated' ? 1 : 0, ahead_by: 2 };
    if (path === `git/commits/${head}`) return { sha: head, tree: { sha: tree } };
    if (path === 'git/commits' && method === 'POST') return { sha: refreshed };
    if (path === `git/refs/heads/${branch}` && method === 'PATCH') { if (scenario !== 'unknown-write') pr.head.sha = body.sha; if (['lost-ack', 'unknown-write'].includes(scenario)) throw Error('Connection lost'); return {}; }
    if (path === `git/ref/heads/${branch}`) return { ref: `refs/heads/${branch}`, object: { sha: pr.head.sha } };
    throw Error(`Unexpected API ${method} ${path}`);
  };
  return { api, calls, snapshot, pr, head, base, tree, refreshed, publish: enabled => createImplementationPullRequest(api, snapshot, [], 'Verified.', '', true, async () => { if (scenario === 'revoked') throw Error('Revoked'); }, async () => {}, { refreshVerification: enabled }) };
}

test('trusted successful correction refreshes stale merge metadata with the exact checked tree', async () => {
  const f = fixture(), result = await f.publish(true);
  assert.equal(result.number, 34);
  assert.equal(result.head.sha, f.refreshed);
  const commits = f.calls.filter(c => c.path === 'git/commits' && c.method === 'POST');
  assert.equal(commits.length, 1);
  assert.equal(commits[0].body.tree, f.tree);
  assert.deepEqual(commits[0].body.parents, [f.head]);
  assert.match(commits[0].body.message, /verification/);
  assert.equal(f.calls.filter(c => c.path.startsWith('git/refs/') && c.method === 'PATCH').length, 1);
  assert.ok(f.calls.every(c => !['git/trees', 'git/blobs', 'git/refs', 'pulls'].includes(c.path)), 'no files, branch, replacement PR or merge created');
});

test('default correction and already-current test merge preserve the existing head', async () => {
  for (const [scenario, enabled] of [['stale', false], ['current', true]]) {
    const f = fixture(scenario); assert.equal((await f.publish(enabled)).head.sha, f.head);
    assert.equal(f.calls.some(c => c.path.startsWith('git/') && c.method !== 'GET'), false);
  }
  for (const field of ['productResume', 'productAlignment']) {
    const f = fixture(); f.snapshot[field] = {};
    assert.equal((await f.publish(true)).head.sha, f.head);
    assert.equal(f.calls.some(c => c.path.startsWith('git/') && c.method !== 'GET'), false);
  }
});

test('changed authority, unrelated bases and malformed subjects cannot publish a verification commit', async () => {
  for (const scenario of ['revoked', 'feedback', 'base', 'wrong-parent', 'unrelated']) {
    const f = fixture(scenario);
    await assert.rejects(f.publish(true), /revoked|changed|base|merge|parent/i);
    assert.equal(f.calls.some(c => c.path.startsWith('git/') && c.method !== 'GET'), false, scenario);
  }
});

test('a lost branch acknowledgement is read back once; an uncertain advance is never repeated', async () => {
  for (const scenario of ['lost-ack', 'unknown-write']) {
    const f = fixture(scenario);
    if (scenario === 'lost-ack') assert.equal((await f.publish(true)).head.sha, f.refreshed);
    else await assert.rejects(f.publish(true), /Connection lost/);
    assert.equal(f.calls.filter(c => c.path.startsWith('git/refs/') && c.method === 'PATCH').length, 1);
    if (scenario === 'lost-ack') {
      await assert.rejects(f.publish(true), /changed/);
      assert.equal(f.calls.filter(c => c.path === 'git/commits' && c.method === 'POST').length, 1);
    }
  }
});

test('merge observation waits for GitHub recomputation and binds the resulting head and base', async () => {
  const f = fixture(); await f.publish(true);
  const expected = structuredClone(f.pr), newMerge = sha('7'); let reads = 0, waits = 0;
  const api = async (path, ...args) => {
    if (path === 'pulls/34' && ++reads === 3) f.pr.merge_commit_sha = newMerge;
    if (path.startsWith('compare/')) return { base_commit: { sha: f.base }, behind_by: 1 };
    if (path === `git/commits/${newMerge}`) return { sha: newMerge, parents: [{ sha: f.base }, { sha: f.refreshed }] };
    return f.api(path, ...args);
  };
  const result = await observeVerificationMerge(api, expected, f.base, async ms => { assert.equal(ms, 250); waits++; });
  assert.equal(result.merge_commit_sha, newMerge); assert.equal(waits, 2);
});

test('merge observation stops on changed authority and bounds an unchanged stale subject', async () => {
  for (const scenario of ['stale', 'head', 'base']) {
    const f = fixture(); await f.publish(true); const expected = structuredClone(f.pr); let waits = 0;
    const api = async (path, ...args) => {
      if (path.startsWith('compare/')) return { base_commit: { sha: f.base }, behind_by: 1 };
      if (scenario === 'head' && path === 'pulls/34') return { ...f.pr, head: { ...f.pr.head, sha: sha('9') } };
      if (scenario === 'base' && path === 'git/ref/heads/main') return { object: { sha: sha('9') } };
      return f.api(path, ...args);
    };
    await assert.rejects(observeVerificationMerge(api, expected, f.base, async () => { waits++; }), /merge subject|changed/);
    assert.equal(waits, scenario === 'stale' ? 19 : 0);
  }
});
