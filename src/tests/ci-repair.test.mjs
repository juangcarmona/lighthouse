import test from 'node:test';
import assert from 'node:assert/strict';
import { ciRepairAfterChecks, ciRepairKey, validateCiRepairChanges } from '../packages/sdlc/src/ci-repair.mjs';
import { taskDigest } from '../packages/sdlc/src/issue-actions.mjs';
import { loadImplementation } from '../packages/sdlc/src/implementation.mjs';

const repository = 'owner/repo', head = 'a'.repeat(40), base = 'c'.repeat(40), identity = 'b'.repeat(64);
const file = value => ({ content: Buffer.from(JSON.stringify(value)).toString('base64') });
function fixture() {
  const state = {
    run: { id: 123, run_attempt: 1, path: '.github/workflows/verify.yml', repository: { full_name: repository }, status: 'completed', conclusion: 'failure', event: 'workflow_dispatch', head_sha: head, head_branch: `lighthouse/implement-47-${identity.slice(0, 12)}`, html_url: 'https://example.test/run/123' },
    pr: { number: 60, state: 'open', merged: false, user: { login: 'github-actions[bot]', type: 'Bot' }, head: { sha: head, ref: `lighthouse/implement-47-${identity.slice(0, 12)}`, repo: { full_name: repository } }, base: { ref: 'main', repo: { full_name: repository } }, body: `<!-- lighthouse-implementation:${identity} -->`, html_url: 'https://example.test/pr/60' },
    issue: { number: 47, title: 'Repair the example', body: 'A bounded change', state: 'open', user: { login: 'owner' }, labels: [] },
    config: { completion: { postMergeWorkflows: ['verify.yml'], ciRepair: { enabled: true, maxAttempts: 2, issues: [47] } } },
    comments: [{ id: 5, user: { login: 'github-actions[bot]', type: 'Bot' }, body: `<!-- lighthouse-stage:implement:passed -->\n<!-- lighthouse-pr-state:{"pr":60,"head":"${head}"} -->` }],
    reviews: [], prior: [], jobs: { total_count: 1, jobs: [{ id: 99, name: 'repository', conclusion: 'failure', steps: [{ name: 'Check acceptance', conclusion: 'failure' }] }] },
  };
  const api = async path => {
    if (path === 'actions/runs/123') return state.run;
    if (path === '') return { default_branch: 'main' };
    if (path === 'commits/main') return { sha: base };
    if (path.startsWith('contents/.lighthouse/github.json')) return file(state.config);
    if (path.startsWith('contents/.lighthouse/implement.json')) return file({ defaults: { scope: 'Only this example.', paths: ['docs/'], checks: [['node', '--test']], reviewRequired: false } });
    if (path.startsWith('contents/.lighthouse/environment.json')) return null;
    if (path.startsWith('commits/')) return state.pulls ?? [state.pr];
    if (path === 'pulls/60') return state.pr;
    if (path === 'issues/47') return state.issue;
    if (path.startsWith('issues/47/comments?')) return state.comments;
    if (path.includes('/reviews?')) return state.reviews;
    if (path === 'actions/runs/123/attempts/1/jobs?per_page=100') return state.jobs;
    if (path === 'actions/jobs/99/logs') return 'Expected accepted text; got broken text.';
    if (path.startsWith('actions/runs/')) return {};
    throw Error(path);
  };
  const readReport = async () => ({ run: { id: 11, run_attempt: 1 }, request: { runId: identity, stage: 'implement', taskDigest: state.intent ?? taskDigest(state.issue, []), implementation: state.implementation ?? await loadImplementation(api, 47, 'owner', base, 'main') } });
  const readDispatch = async (_api, _repo, _owner, _issue, id) => state.prior.find(item => item.commentId === id);
  const call = options => ciRepairAfterChecks(api, repository, 'owner', { action: 'completed', workflow_run: { id: 123, head_sha: head } }, { readReport, readDispatch, ...options });
  return { state, call };
}

test('failed adopted CI uses the authenticated original grant and existing correction worker', async () => {
  const { state, call } = fixture();
  const route = await call();
  assert.equal(route.worker, 'apply-review');
  assert.equal(route.implementationReview.number, 60);
  assert.equal(route.ciRepair.attempt, 1);
  assert.equal(route.ciRepair.grant.runId, '11');
  assert.match(route.implementationReview.feedback, /Expected accepted text/);
  state.run.id = 456;
  assert.equal(ciRepairKey(route.implementationReview), ciRepairKey({ ...route.implementationReview, id: 456 }));
});

test('unrelated, stale, fork and unsupported runs never authorize repair', async () => {
  for (const delta of [{ repository: { full_name: 'fork/repo' } }, { conclusion: 'cancelled' }, { event: 'pull_request_target' }, { head_sha: base }, { head_branch: 'main' }, { path: '.github/workflows/other.yml' }]) {
    const { state, call } = fixture(); Object.assign(state.run, delta); assert.equal(await call(), null);
  }
  const { state, call } = fixture(); state.pulls = [state.pr, { ...state.pr }]; assert.equal(await call(), null);
});

test('missing opt-in, revoked intent, scope changes and human decisions cannot authorize source effects', async () => {
  const { state, call } = fixture();
  state.config.completion.ciRepair.enabled = false; assert.equal(await call(), null);
  state.config.completion.ciRepair.enabled = true;
  state.intent = 'stale'; assert.match((await call()).ciRepairStop, /grant/);
  delete state.intent; state.implementation = {}; assert.match((await call()).ciRepairStop, /grant/);
  delete state.implementation; state.issue.labels = [{ name: 'future' }]; assert.match((await call()).ciRepairStop, /paused/);
  state.issue.labels = []; state.reviews = [{ user: { login: 'owner' }, state: 'CHANGES_REQUESTED' }]; assert.match((await call()).ciRepairStop, /owner review/);
});

test('the two-attempt budget survives changed heads; duplicate and uncertain effects never dispatch again', async () => {
  const { state, call } = fixture();
  const add = (number, repairHead, status = 'completed') => {
    const receipt = { schemaVersion: 1, stage: 'implement', worker: 'apply-review', status, id: 'd'.repeat(64), digest: 'e'.repeat(64), routerRunId: 10 + number, routerAttempt: 1, workerRunId: 20 + number };
    // The production reader authenticates receipts; supply its actual computed ID.
    const { routerRunId } = receipt;
    return import('../packages/sdlc/src/stage-dispatch.mjs').then(({ dispatchId }) => {
      receipt.id = dispatchId(repository, routerRunId, 'implement');
      state.comments.push({ id: 100 + number, issue_url: `https://api.github.com/repos/${repository}/issues/47`, user: { login: 'github-actions[bot]', type: 'Bot' }, body: `<!-- lighthouse-dispatch:${JSON.stringify(receipt)} -->` });
      state.prior.push({ commentId: 100 + number, receipt, request: { id: receipt.id, ciRepair: { pr: 60, identity, head: repairHead, attempt: number } } });
      return receipt;
    });
  };
  await add(1, base);
  assert.equal((await call()).ciRepair.attempt, 2);
  const second = await add(2, head);
  assert.equal(await call(), null);
  assert.equal((await call({ currentDispatch: second.id })).ciRepair.attempt, 2);
  state.prior[1].request.ciRepair.head = 'f'.repeat(40);
  assert.match((await call()).ciRepairStop, /Two automatic/);
  state.prior.pop(); state.comments.pop(); state.prior[0].receipt.status = 'waiting';
  assert.match((await call()).ciRepairStop, /unconfirmed/);
  state.prior[0].receipt.status = 'uncertain';
  assert.match((await call()).ciRepairStop, /unconfirmed/);
});

test('lost dispatch acknowledgement, unavailable origin and invalid policy stop before another effect', async () => {
  const { state, call } = fixture();
  state.comments.push({ id: 100, issue_url: `https://api.github.com/repos/${repository}/issues/47`, user: { login: 'github-actions[bot]', type: 'Bot' }, body: `<!-- lighthouse-dispatch:${JSON.stringify({ schemaVersion: 1, stage: 'implement', worker: 'apply-review', status: 'requested', id: (await import('../packages/sdlc/src/stage-dispatch.mjs')).dispatchId(repository, 12, 'implement'), digest: 'e'.repeat(64), routerRunId: 12, routerAttempt: 1, workerRunId: null })} -->` });
  assert.match((await call()).ciRepairStop, /no confirmed worker/);
  state.comments.pop();
  assert.match((await call({ readReport: async () => { throw Error('Original artifact expired'); } })).ciRepairStop, /cannot be authenticated/);
  state.config.completion.ciRepair.maxAttempts = 3;
  await assert.rejects(call(), /two-attempt/);
});


test('CI correction preserves product models and other Product Changes, including configured roots', () => {
  for (const path of ['docs/product/model/requirement.md', 'docs/product/changes/approved/change.md', 'openspec/changes/product-proposal/proposal.md']) assert.throws(() => validateCiRepairChanges([{ path }], 47), /product meaning/);
  assert.throws(() => validateCiRepairChanges([{ path: 'product/custom/model/requirement.md' }], 47, 'product/custom/model'), /product meaning/);
  assert.doesNotThrow(() => validateCiRepairChanges([{ path: 'docs/example.md' }, { path: 'openspec/changes/issue-47-proposal/tasks.md' }], 47));
});

test('an external or unconfirmed current-head edit cannot borrow an older candidate publication', async () => {
  const { state, call } = fixture();
  state.comments[0].body = state.comments[0].body.replace(head, base);
  assert.match((await call()).ciRepairStop, /no authenticated implementation publication/);
  state.comments[0].body += `\n<!-- lighthouse-pr-state:{"pr":60,"head":"${head}"} -->`;
  assert.match((await call()).ciRepairStop, /no authenticated implementation publication/);
});
