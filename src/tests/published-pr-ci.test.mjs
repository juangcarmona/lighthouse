import test from 'node:test';
import assert from 'node:assert/strict';
import { checkPublication, checkImplementationPrInventory, taskDigest } from '../packages/sdlc/src/issue-actions.mjs';
import { createImplementationPullRequest } from '../packages/sdlc/src/implementation.mjs';
import { dispatchDeliveryChecks } from '../packages/sdlc/src/delivery-events.mjs';

const repository = 'owner/repo', base = 'a'.repeat(40), head = 'b'.repeat(40), runId = 'c'.repeat(64);
function fixture(epic = false) {
  const issue = { title: 'Bounded summary', body: 'Classify the supplied observations.', state: 'open', labels: [{ name: 'agent-working' }] };
  const snapshot = { issue: 18, repository, title: issue.title, runId, sourceRevision: base, defaultBranch: 'main', taskDigest: taskDigest(issue, []), implementation: { policy: { scope: 'Only the summary', paths: ['src/'], checks: [['npm', 'test']], reviewRequired: false } } };
  if (epic) snapshot.epic = { parent: 146, base: 'lighthouse/epic-146', baseSha: base };
  const f = { issue, snapshot, pulls: [], pushes: [], requests: [], source: base, reference: null, published: null };
  f.check = async () => { checkPublication(snapshot, issue, [], f.source); checkImplementationPrInventory(f.pulls, snapshot, f.published); };
  f.api = async (path, method = 'GET', body) => {
    if (path === 'pulls' && method === 'POST') {
      const pr = { id: 700, number: 7, state: 'open', merged: false, draft: body.draft, body: body.body, user: { login: 'github-actions[bot]', type: 'Bot' }, head: { sha: head, ref: body.head, repo: { full_name: repository } }, base: { sha: base, ref: body.base, repo: { full_name: repository } } };
      f.pulls.push(pr); return structuredClone(pr);
    }
    if (path === 'pulls/7') return f.pulls[0];
    if (path.startsWith('git/commits/') && method === 'GET') return { tree: { sha: base } };
    if (path === 'git/ref/heads/lighthouse/epic-146') return { ref: 'refs/heads/lighthouse/epic-146', object: { sha: f.source } };
    if (path === 'git/commits' && method === 'POST') return { sha: head };
    if (path.startsWith('git/') && method === 'POST') return { sha: base };
    if (path.startsWith('contents/.lighthouse/github.json?')) return { content: Buffer.from(JSON.stringify({ completion: { postMergeWorkflows: ['ci.yml'] } })).toString('base64') };
    if (path.startsWith('contents/.github/workflows/ci.yml?')) return { type: 'file', sha: base };
    if (path.startsWith('actions/workflows/ci.yml/runs?')) return { total_count: f.requests.length, workflow_runs: f.requests };
    if (path.startsWith('git/ref/heads/lighthouse/verification-7-')) return f.reference;
    throw Error(`Unexpected ${method} ${path}`);
  };
  f.publish = async () => { f.published = await createImplementationPullRequest(f.api, snapshot, [{ path: 'src/summary.mjs', mode: '100644', content: Buffer.from('export const summary = 1;').toString('base64') }], 'Candidate', '', true, f.check); };
  f.start = () => dispatchDeliveryChecks(f.api, base, f.published, { beforeWrite: f.check, ciTrigger: async input => {
    await input.beforeWrite(); f.pushes.push(input.head);
    f.reference = { ref: `refs/heads/${input.branch}`, object: { sha: input.head } };
    f.requests.push({ id: 50, head_sha: input.head, head_branch: input.branch, path: '.github/workflows/ci.yml', event: 'push', repository: { full_name: repository } });
  } });
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
    f => { f.pulls[0].base.sha = head; },
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
