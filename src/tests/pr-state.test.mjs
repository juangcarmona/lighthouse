import test from 'node:test';
import assert from 'node:assert/strict';
import { authorizedCiCallback, implementationPrProof, reconcileImplementationPr, scheduledImplementationPulls } from '../packages/sdlc/src/pr-state.mjs';

const repo = 'owner/repo', head = 'a'.repeat(40), run = '123';
const pr = draft => ({
  number: 34, state: 'open', draft, merged: false,
  user: { login: 'github-actions[bot]', type: 'Bot' },
  head: { sha: head, ref: `lighthouse/implement-18-${'b'.repeat(12)}`, repo: { full_name: repo } },
  base: { ref: 'main', repo: { full_name: repo } },
  body: `Refs #18. <!-- lighthouse-implementation:${'b'.repeat(64)} -->`,
});
const comment = (complete, revision = head) => ({
  user: { login: 'github-actions[bot]', type: 'Bot' },
  body: `<!-- lighthouse-pr-state:${JSON.stringify({ pr: 34, head: revision, complete, run: Number(run) })} -->`,
});
const fixture = (draft, passed = true) => {
  const issue = { number: 18, state: 'open', labels: [{ name: 'ready' }, { name: 'waiting-review' }] };
  const candidate = pr(draft), changed = [];
  const api = async (path, method, body) => {
    if (path.startsWith(`commits/${head}/check-runs`)) return { check_runs: passed ? [{ name: 'repository', app: { id: 15368 }, head_sha: head, status: 'completed', conclusion: 'success' }] : [] };
    if (path.startsWith(`commits/${head}/statuses`)) return [];
    if (path === 'issues/18' && method === undefined) return issue;
    if (path === 'issues/18/labels' && method === 'POST') { for (const name of body.labels) issue.labels.push({ name }); return []; }
    if (path.startsWith('issues/18/labels/') && method === 'DELETE') { issue.labels = issue.labels.filter(item => item.name !== path.split('/').at(-1)); return null; }
    throw Error(`Unexpected API call: ${path}`);
  };
  const setDraft = async (_, value) => { changed.push(value); candidate.draft = value; };
  return { issue, candidate, api, setDraft, changed };
};

test('a complete draft becomes reviewable only after required CI passes', async () => {
  const state = fixture(true);
  const result = await reconcileImplementationPr(state.api, repo, state.candidate, state.issue, [comment(true)], [{ context: 'repository', app: 15368 }], state.setDraft, { auto: true });
  assert.equal(result.status, 'ready');
  assert.deepEqual(state.changed, [false]);
  assert.deepEqual(state.issue.labels.map(label => label.name), ['pr-ready']);
  await reconcileImplementationPr(state.api, repo, state.candidate, state.issue, [comment(true)], [{ context: 'repository', app: 15368 }], state.setDraft, { auto: true });
  assert.deepEqual(state.changed, [false]);
});

test('manual readiness of an incomplete or stale-head candidate returns to draft', async () => {
  for (const comments of [[comment(false)], [comment(true, 'c'.repeat(40))]]) {
    const state = fixture(false);
    const result = await reconcileImplementationPr(state.api, repo, state.candidate, state.issue, comments, [{ context: 'repository', app: 15368 }], state.setDraft);
    assert.equal(result.status, 'draft');
    assert.deepEqual(state.changed, [true]);
    assert.deepEqual(state.issue.labels.map(label => label.name), ['pr-draft']);
  }
});

test('a passing candidate stays draft until CI passes, and a foreign PR is rejected', async () => {
  const state = fixture(true, false);
  await reconcileImplementationPr(state.api, repo, state.candidate, state.issue, [comment(true)], [{ context: 'repository', app: 15368 }], state.setDraft, { auto: true });
  assert.deepEqual(state.changed, []);
  assert.deepEqual(state.issue.labels.map(label => label.name), ['pr-draft']);
  assert.equal(implementationPrProof([comment(true, 'c'.repeat(40))], state.candidate), null);
  await assert.rejects(reconcileImplementationPr(state.api, repo, { ...state.candidate, user: { login: 'stranger', type: 'User' } }, state.issue, [comment(true)], [], state.setDraft), /repository-owned implementation PR/);
});

test('a running correction keeps the PR draft until its reservation is released', async () => {
  const state = fixture(true);
  state.issue.labels.push({ name: 'agent-working' });
  await reconcileImplementationPr(state.api, repo, state.candidate, state.issue, [comment(true)], [{ context: 'repository', app: 15368 }], state.setDraft, { auto: true });
  assert.deepEqual(state.changed, []);
  state.issue.labels = state.issue.labels.filter(label => label.name !== 'agent-working');
  await reconcileImplementationPr(state.api, repo, state.candidate, state.issue, [comment(true)], [{ context: 'repository', app: 15368 }], state.setDraft, { auto: true });
  assert.deepEqual(state.changed, [false]);
});

test('scheduled reconciliation selects only bot implementation PRs', async () => {
  const api = async path => {
    assert.equal(path, 'pulls?state=open&per_page=100&page=1');
    return [
      { number: 172, head: { ref: 'lighthouse/implement-171-b467e429e869' }, user: { login: 'github-actions[bot]' } },
      { number: 173, head: { ref: 'lighthouse/implement-171-b467e429e869' }, user: { login: 'other' } },
      { number: 174, head: { ref: 'feature/docs' }, user: { login: 'github-actions[bot]' } },
    ];
  };
  assert.deepEqual(await scheduledImplementationPulls(api), [172]);
});

test('CI callback accepts only the current configured repository run', () => {
  const context = { id: 123, sha: head, repo, workflows: ['ci.yml'] };
  const run = { id: 123, event: 'workflow_dispatch', head_sha: head, path: '.github/workflows/ci.yml', repository: { full_name: repo } };
  assert.equal(authorizedCiCallback(run, context), true);
  for (const changed of [{ id: 124 }, { event: 'pull_request' }, { head_sha: 'c'.repeat(40) }, { path: '.github/workflows/other.yml' }, { repository: { full_name: 'other/repo' } }]) assert.equal(authorizedCiCallback({ ...run, ...changed }, context), false);
});
