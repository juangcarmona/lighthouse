import test from 'node:test';
import assert from 'node:assert/strict';
import { dispatchDeliveryChecks } from '../packages/sdlc/src/delivery-events.mjs';

const repository = 'owner/repo', head = 'a'.repeat(40), base = 'b'.repeat(40), merge = 'c'.repeat(40), blob = 'd'.repeat(40);
const now = Date.parse('2026-11-06T12:00:00Z');
function fixture() {
  const pr = { number: 12, state: 'open', merge_commit_sha: merge, head: { sha: head, ref: 'lighthouse/implement-9', repo: { full_name: repository } }, base: { sha: 'e'.repeat(40), ref: 'main', repo: { full_name: repository } } };
  const f = { pr, base, behind: 1, parents: [base, head], refs: new Map(), runs: new Map(), writes: [], saved: null, mode: null };
  const api = async (path, method = 'GET') => {
    assert.equal(method, 'GET', 'Only the App trigger can create a ref');
    if (path.startsWith('contents/.lighthouse/')) return { content: Buffer.from(JSON.stringify({ completion: { postMergeWorkflows: ['ci.yml'] } })).toString('base64') };
    if (path === 'pulls/12') return structuredClone(pr);
    if (path === 'git/ref/heads/main') return { object: { sha: f.base } };
    if (path.startsWith('git/ref/heads/')) return f.refs.get(path.slice('git/ref/heads/'.length)) ?? null;
    if (path === `compare/${base}...${head}`) return { base_commit: { sha: base }, behind_by: f.behind };
    if (path === 'git/commits/' + merge) return { sha: merge, parents: f.parents.map(sha => ({ sha })) };
    if (path.startsWith('contents/.github/workflows/')) return { type: 'file', sha: f.mode === 'changed-merge-workflow' && path.endsWith(merge) ? head : blob };
    const match = path.match(/^actions\/workflows\/ci.yml\/runs\?head_sha=([a-f0-9]{40})&per_page=100$/);
    assert.ok(match, path);
    const rows = f.runs.get(match[1]) ?? [];
    return { total_count: rows.length, workflow_runs: rows };
  };
  const checkpoint = async rows => { f.saved = structuredClone(rows); };
  const ciTrigger = async input => {
    assert.ok(f.saved.some(row => row.head === input.head && row.state === 'requested'));
    if (input.head === merge && f.mode === 'moved-base') f.base = head;
    if (input.head === merge && f.mode === 'moved-head') pr.head.sha = base;
    if (input.head === merge && f.mode === 'changed-merge') pr.merge_commit_sha = head;
    await input.beforeWrite();
    f.writes.push(input.head);
    if (input.head === merge && ['unknown', 'rejected'].includes(f.mode)) throw Object.assign(Error('Unconfirmed'), { referenceAttempted: f.mode !== 'rejected' });
    f.refs.set(input.branch, { ref: 'refs/heads/' + input.branch, object: { sha: input.head } });
    f.runs.set(input.head, [{ id: input.head === head ? 101 : 102, head_sha: input.head, head_branch: input.branch, event: 'push', repository: { full_name: repository }, path: '.github/workflows/ci.yml' }]);
    if (input.head === merge && f.mode === 'lost-response') throw Object.assign(Error('Lost response'), { referenceAttempted: true });
    return { tokenRevoked: true };
  };
  f.dispatch = options => dispatchDeliveryChecks(api, base, { ...pr, head: { ...pr.head, sha: head } }, { checkpoint, ciTrigger, now, ...options });
  return f;
}

test('diverged delivery verifies both exact head and current merge tree with separate retained identities', async () => {
  const f = fixture(), first = await f.dispatch();
  assert.deepEqual(f.writes, [head, merge]);
  assert.deepEqual(first.map(r => [r.head, r.sourceHead, r.base, r.run]), [[head, undefined, base, 101], [merge, head, base, 102]]);
  assert.ok(first.every(r => r.state === 'observed'));
  assert.deepEqual(await f.dispatch({ previous: first, ciTrigger: null }), first.map(({ app, ...row }) => row));
  assert.deepEqual(f.writes, [head, merge]);
  const current = fixture(); current.behind = 0;
  assert.equal((await current.dispatch()).length, 1);
  assert.deepEqual(current.writes, [head]);
});

test('wrong merge parents, changed workflows and authority cannot emit a merge verification push', async t => {
  const cases = {
    'missing base parent': f => { f.parents = [head, blob]; },
    'missing head parent': f => { f.parents = [base, blob]; },
    'extra parent': f => { f.parents.push(blob); },
    'invalid comparison': f => { f.behind = '1'; },
    'changed merge workflow': f => { f.mode = 'changed-merge-workflow'; },
    'base moved after mint': f => { f.mode = 'moved-base'; },
    'head moved after mint': f => { f.mode = 'moved-head'; },
    'merge changed after mint': f => { f.mode = 'changed-merge'; },
  };
  for (const [name, mutate] of Object.entries(cases)) await t.test(name, async () => {
    const f = fixture(); mutate(f); await assert.rejects(f.dispatch());
    assert.deepEqual(f.writes, [head]);
  });
});

test('merge CI lost acknowledgements, unknown effects and retry budgets preserve the observed head request', async () => {
  const lost = fixture(); lost.mode = 'lost-response';
  const observed = await lost.dispatch();
  await lost.dispatch({ previous: observed }); assert.deepEqual(lost.writes, [head, merge]);
  const unknown = fixture(); unknown.mode = 'unknown';
  await assert.rejects(unknown.dispatch());
  assert.equal(unknown.saved[0].state, 'observed'); assert.equal(unknown.saved[1].state, 'unknown');
  await assert.rejects(unknown.dispatch({ previous: unknown.saved }));
  assert.deepEqual(unknown.writes, [head, merge]);
  const rejected = fixture(); rejected.mode = 'rejected';
  await assert.rejects(rejected.dispatch()); const prior = structuredClone(rejected.saved);
  assert.equal(prior[1].state, 'rejected');
  await assert.rejects(rejected.dispatch({ previous: prior, now: now + 1 }), e => e.ciRequestFailure.code === 'delay-pending');
  const exhausted = structuredClone(prior); exhausted[1].attempt = 3;
  await assert.rejects(rejected.dispatch({ previous: exhausted, now: now + 3600000 }), e => e.ciRequestFailure.code === 'budget-exhausted');
  rejected.mode = null;
  const retried = await rejected.dispatch({ previous: prior, now: now + 3600000 });
  assert.equal(retried[1].attempt, 2); assert.equal(retried[0].attempt, 1);
  assert.deepEqual(rejected.writes, [head, merge, merge]);
});
