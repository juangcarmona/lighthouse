import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { authorizedCiCallback, draftIntentMarker, implementationPrProof, isCurrentPullRequestEvent, pendingDraftIntent, reconcileImplementationPr, scheduledImplementationPulls, isProductOnlyPullRequest, isStaleProductDecision } from '../packages/sdlc/src/pr-state.mjs';

const repo = 'owner/repo', head = 'a'.repeat(40), run = '123';
test('scheduled, event and repository CI reconciliation share one non-cancelling queue', async () => {
  const router = await readFile(new URL('../packages/sdlc/workflows/lighthouse-sdlc-router.yml', import.meta.url), 'utf8');
  const installed = await readFile(new URL('../../.github/workflows/lighthouse-sdlc-router.yml', import.meta.url), 'utf8');
  const ci = await readFile(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8');
  for (const [workflow, job] of [[router, 'pr-state'], [installed, 'pr-state'], [ci, 'reconcile-implementation-pr']]) {
    const section = workflow.split(`  ${job}:\n`)[1]?.split(/\n  [a-z][a-z-]*:\n/)[0];
    assert.match(section, /concurrency:\n      group: lighthouse-pr-state\n      cancel-in-progress: false\n      queue: max/);
  }
});
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

test('delayed PR events cannot project a state that has since changed', () => {
  assert.equal(isCurrentPullRequestEvent('converted_to_draft', pr(false)), false);
  assert.equal(isCurrentPullRequestEvent('ready_for_review', pr(true)), false);
  assert.equal(isCurrentPullRequestEvent('closed', pr(false)), false);
  assert.equal(isCurrentPullRequestEvent('reopened', { ...pr(false), state: 'closed' }), false);
  assert.equal(isCurrentPullRequestEvent('converted_to_draft', pr(true)), true);
  assert.equal(isCurrentPullRequestEvent('ready_for_review', pr(false)), true);
  assert.equal(isCurrentPullRequestEvent('closed', { ...pr(false), state: 'closed' }), true);
  assert.equal(isCurrentPullRequestEvent('reopened', pr(false)), true);
});

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

test('an interrupted draft handoff is recoverable and a replay sees its outcome', async () => {
  const state = fixture(false), comments = [comment(false)];
  const bot = { login: 'github-actions[bot]', type: 'Bot' }, marker = draftIntentMarker(state.candidate, run);
  await assert.rejects(reconcileImplementationPr(state.api, repo, state.candidate, state.issue, comments, [{ context: 'repository', app: 15368 }], state.setDraft, { beforeDraft: async () => { throw Error('intent unavailable'); } }), /intent unavailable/);
  assert.deepEqual(state.changed, []);
  await reconcileImplementationPr(state.api, repo, state.candidate, state.issue, comments, [{ context: 'repository', app: 15368 }], state.setDraft, { beforeDraft: async () => { comments.push({ user: bot, body: marker }); } });
  assert.equal(state.candidate.draft, true);
  const outcome = pendingDraftIntent(comments, state.candidate);
  assert.match(outcome, /lighthouse-pr-draft-outcome/);
  const current = await reconcileImplementationPr(state.api, repo, state.candidate, state.issue, comments, [{ context: 'repository', app: 15368 }], state.setDraft);
  assert.equal(current.reason, 'Implementation is incomplete');
  comments.push({ user: bot, body: outcome });
  assert.equal(pendingDraftIntent(comments, state.candidate), null);
  assert.equal(pendingDraftIntent([{ user: { login: 'other', type: 'User' }, body: marker }], state.candidate), null);
  assert.equal(pendingDraftIntent(comments.slice(0, -1), { ...state.candidate, head: { ...state.candidate.head, sha: 'c'.repeat(40) } }), null);
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

test('product decisions are not projected as implementation PR state', async () => {
  const checkpoint = { schemaVersion: 1, kind: 'checkpoint', identity: { repository: repo, issue: 18, parentRunId: '200', authorizationDigest: '1'.repeat(64), policyDigest: '2'.repeat(64), workflowRevision: '3'.repeat(40), head }, requestDigest: '4'.repeat(64), changeName: 'example', changeId: 'CHG-EXAMPLE', proposalDigest: '5'.repeat(64), baselineDigest: '6'.repeat(64), state: 'waiting-product-decision', effectIds: [`pr:40:${head}`] };
  const productOnly = { ...pr(true), number: 40, body: `<!-- lighthouse-product-change-checkpoint:${JSON.stringify(checkpoint)} -->` };
  const malformedImplementation = { ...productOnly, number: 41, body: `${productOnly.body}\n<!-- lighthouse-product-implementation:{} -->` };
  assert.equal(isProductOnlyPullRequest(productOnly), true);
  assert.equal(isStaleProductDecision(productOnly), false);
  const stale = { ...productOnly, head: { ...productOnly.head, sha: '9'.repeat(40) } };
  assert.equal(isStaleProductDecision(stale), true);
  assert.equal(isProductOnlyPullRequest(malformedImplementation), false);
  assert.equal(isProductOnlyPullRequest({ ...productOnly, body: '<!-- lighthouse-product-change-checkpoint:{} -->' }), false);
  assert.deepEqual(await scheduledImplementationPulls(async () => [productOnly, malformedImplementation, stale]), [41, 40]);
});
