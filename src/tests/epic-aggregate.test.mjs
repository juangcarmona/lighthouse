import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDecompositionPlan } from '../packages/sdlc/src/decompose.mjs';
import { epicPlanDigest } from '../packages/sdlc/src/epic.mjs';
import { epicCorrelation, epicJournalKey } from '../packages/sdlc/src/epic-github.mjs';
import { publishEpicAggregate, readyEpicAggregate } from '../packages/sdlc/src/epic-native.mjs';

const repository = 'owner/repo', owner = 'owner', source = 'a'.repeat(40), first = 'b'.repeat(40), second = 'c'.repeat(40), tree1 = 'd'.repeat(40), tree2 = 'e'.repeat(40), head1 = '1'.repeat(40), head2 = '2'.repeat(40), candidate1 = '3'.repeat(40), candidate2 = '4'.repeat(40);
function fixture() {
  const plan = buildDecompositionPlan({ schemaVersion: 1, parent: { id: 'GH-146', title: 'Parent' }, slices: [
    { id: 'first', title: 'First', dependencies: [], acceptance: ['First'] },
    { id: 'second', title: 'Second', dependencies: ['first'], acceptance: ['Second'] },
  ] });
  const snapshot = { issue: 146, repository, owner, sourceRevision: source, defaultBranch: 'main', plan }, planDigest = epicPlanDigest(plan), base = 'lighthouse/epic-146';
  const entries = new Map(), comments = [], pulls = [], writes = [], reviews = new Map();
  const commits = new Map([[first, { parents: [{ sha: source }], tree: { sha: tree1 } }], [candidate1, { tree: { sha: tree1 } }], [second, { parents: [{ sha: first }], tree: { sha: tree2 } }], [candidate2, { tree: { sha: tree2 } }]]);
  const prs = new Map();
  for (const [index, slice] of plan.slices.entries()) {
    const correlation = epicCorrelation({ repository, parent: 146, slice: slice.id, planDigest, base, dependencies: slice.dependencies, kind: 'pull-request' });
    const resource = { id: index + 100, number: index + 10 }, merge = { head: index ? head2 : head1, base: index ? first : source, candidate: index ? candidate2 : candidate1, review: index + 20, commit: index ? second : first };
    entries.set(epicJournalKey(correlation), { schemaVersion: 1, state: 'accepted', correlation, resource, publication: { run: '100', attempt: 1, head: merge.head }, merge });
    prs.set(resource.number, { ...resource, merged: true, user: { login: 'github-actions[bot]', type: 'Bot' }, head: { sha: merge.head, repo: { full_name: repository } }, base: { ref: base, repo: { full_name: repository } }, merge_commit_sha: merge.commit, merged_by: { login: 'github-actions[bot]', type: 'Bot' } });
    reviews.set(resource.number, [{ id: merge.review, user: { login: owner, type: 'User' }, state: 'APPROVED', commit_id: merge.head }]);
  }
  let lost = false;
  const api = async (path, method = 'GET', body) => {
    if (method !== 'GET') writes.push({ path, method });
    if (path === `git/ref/heads/${base}`) return { ref: `refs/heads/${base}`, object: { sha: second } };
    if (path.startsWith('git/commits/')) return commits.get(path.split('/').at(-1));
    const check = path.match(/^commits\/([a-f0-9]{40})\/check-runs\?/); if (check) return { check_runs: [{ id: 1, name: 'ci', head_sha: check[1], status: 'completed', conclusion: 'success', app: { id: 42 } }] };
    if (/^commits\/[a-f0-9]{40}\/statuses\?/.test(path)) return [];
    const review = path.match(/^pulls\/(\d+)\/reviews\?/); if (review) return reviews.get(Number(review[1]));
    if (/^pulls\/\d+$/.test(path)) return prs.get(Number(path.split('/')[1]));
    if (path.startsWith('pulls?')) return pulls;
    if (path === 'pulls' && method === 'POST') {
      const pr = { id: 300, number: 30, html_url: `https://github.com/${repository}/pull/30`, state: 'open', merged: false, user: { login: 'github-actions[bot]', type: 'Bot' }, body: body.body, head: { ref: base, sha: second, repo: { full_name: repository } }, base: { ref: 'main', repo: { full_name: repository } } };
      pulls.push(pr); if (lost) throw Error('response lost'); return pr;
    }
    if (path.startsWith('issues/146/comments?')) return comments;
    if (path === 'issues/146/comments' && method === 'POST') { const comment = { id: comments.length + 1, user: { login: 'github-actions[bot]', type: 'Bot' }, body: body.body }; comments.push(comment); return comment; }
    throw Error(`Unexpected ${method} ${path}`);
  };
  const journal = { readReceipt: async key => structuredClone(entries.get(key)), writeReceipt: async (key, receipt) => { entries.set(key, structuredClone(receipt)); } };
  const args = { api, repository, owner, snapshot, journal, authorize: async () => true, loadPolicy: async () => ({ checks: [{ context: 'ci', app: 42 }] }), findCandidates: async (_api, correlation) => [{ number: correlation.slice === 'first' ? 51 : 52, state: 'closed' }], authenticate: async input => ({ parent: 146, slice: input.child === 51 ? 'first' : 'second', planDigest, base, sourceRevision: source }) };
  return { args, entries, pulls, writes, reviews, comments, lose: () => { lost = true; }, run: () => publishEpicAggregate(args) };
}

test('aggregate publication creates one draft from accepted child history and keeps the parent open', async () => {
  const f = fixture();
  assert.deepEqual(await f.run(), { status: 'published', pullRequest: 30, head: second, parent: 'open' });
  assert.match(f.pulls[0].body, /Refs #146/);
  assert.doesNotMatch(f.pulls[0].body, /Closes #146/);
  assert.equal(f.comments.length, 1);
  assert.equal((await f.run()).pullRequest, 30);
  assert.equal(f.writes.filter(write => write.path === 'pulls').length, 1);
  assert.equal(f.comments.length, 1);
});

test('aggregate creation never repeats an uncertain POST', async () => {
  const f = fixture(); f.lose();
  await assert.rejects(f.run(), /response lost/);
  await assert.rejects(f.run(), /authenticated receipt/);
  assert.equal(f.pulls.length, 1);
  assert.equal(f.writes.filter(write => write.path === 'pulls').length, 1);
});

test('aggregate publication stops when an accepted child approval is revoked', async () => {
  const f = fixture();
  f.reviews.get(10).push({ id: 99, user: { login: owner, type: 'User' }, state: 'CHANGES_REQUESTED', commit_id: head1 });
  await assert.rejects(f.run(), /approval was revoked/);
  assert.equal(f.writes.length, 0);
});

test('aggregate publication rejects a receipt whose dependency correlation changed', async () => {
  const f = fixture();
  [...f.entries.values()][0].correlation.dependencies = ['second'];
  await assert.rejects(f.run(), /correlation changed/);
  assert.equal(f.writes.length, 0);
});

test('an aggregate handoff whose response is lost is reconciled without another comment', async () => {
  const f = fixture(), original = f.args.api; let lost = true;
  f.args.api = async (path, method, body) => {
    const result = await original(path, method, body);
    if (path === 'issues/146/comments' && method === 'POST' && lost) { lost = false; throw Error('comment response lost'); }
    return result;
  };
  await assert.rejects(f.run(), /comment response lost/);
  assert.equal((await f.run()).pullRequest, 30);
  assert.equal(f.comments.length, 1);
  assert.equal(f.writes.filter(write => write.path === 'pulls').length, 1);
});

test('an edited aggregate body cannot silently add parent-closing keywords', async () => {
  const f = fixture();
  await f.run();
  f.pulls[0].body += '\n\nCloses #146';
  await assert.rejects(f.run(), /receipt or changed/);
  assert.equal(f.pulls.length, 1);
});

test('aggregate readiness binds the current main base, head and checks', async () => {
  const f = fixture();
  await f.run();
  const pr = f.pulls[0], candidate = '5'.repeat(40);
  Object.assign(pr, { draft: true, mergeable: true, merge_commit_sha: candidate });
  const original = f.args.api;
  f.args.api = async (path, method, body) => {
    if (path === 'pulls/30') return pr;
    if (path === 'git/ref/heads/main') return { ref: 'refs/heads/main', object: { sha: source } };
    if (path === `git/commits/${candidate}`) return { parents: [{ sha: source }, { sha: second }] };
    return original(path, method, body);
  };
  const ready = () => readyEpicAggregate({ ...f.args, setDraft: async () => { pr.draft = false; } });
  assert.deepEqual(await ready(), { status: 'ready', pullRequest: 30, head: second, base: source, parent: 'open' });
  pr.merge_commit_sha = '6'.repeat(40);
  await assert.rejects(ready(), /Aggregate checks do not bind/);
});

test('aggregate readiness reports uncertainty if main changes during publication', async () => {
  const f = fixture();
  await f.run();
  const pr = f.pulls[0], candidate = '5'.repeat(40), nextBase = '6'.repeat(40);
  Object.assign(pr, { draft: true, mergeable: true, merge_commit_sha: candidate });
  const original = f.args.api;
  let main = source;
  f.args.api = async (path, method, body) => {
    if (path === 'pulls/30') return pr;
    if (path === 'git/ref/heads/main') return { ref: 'refs/heads/main', object: { sha: main } };
    if (path === `git/commits/${candidate}`) return { parents: [{ sha: source }, { sha: second }] };
    return original(path, method, body);
  };
  await assert.rejects(readyEpicAggregate({ ...f.args, setDraft: async () => { pr.draft = false; main = nextBase; } }), /Aggregate checks do not bind/);
  assert.equal(pr.draft, false);
});

test('aggregate remains draft when current merge checks fail', async () => {
  const f = fixture();
  await f.run();
  const pr = f.pulls[0], candidate = '5'.repeat(40);
  Object.assign(pr, { draft: true, mergeable: true, merge_commit_sha: candidate });
  const original = f.args.api;
  f.args.api = async (path, method, body) => {
    if (path === 'pulls/30') return pr;
    if (path === 'git/ref/heads/main') return { ref: 'refs/heads/main', object: { sha: source } };
    if (path === `git/commits/${candidate}`) return { parents: [{ sha: source }, { sha: second }] };
    if (path.startsWith(`commits/${candidate}/check-runs?`)) return { check_runs: [{ id: 1, name: 'ci', head_sha: candidate, status: 'completed', conclusion: 'failure', app: { id: 42 } }] };
    return original(path, method, body);
  };
  let changed = false;
  await assert.rejects(readyEpicAggregate({ ...f.args, setDraft: async () => { changed = true; } }), /Aggregate checks do not bind/);
  assert.equal(changed, false);
  assert.equal(pr.draft, true);
});
