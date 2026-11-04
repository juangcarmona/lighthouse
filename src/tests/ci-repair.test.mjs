import test from 'node:test';
import assert from 'node:assert/strict';
import { ciRepairAfterChecks, ciRepairKey, validateCiRepairChanges, signalCiRepair, signalCurrentCiRepair } from '../packages/sdlc/src/ci-repair.mjs';
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
    if (path.startsWith('actions/runs?head_sha=')) return { total_count: (state.runs ?? [state.run]).length, workflow_runs: state.runs ?? [state.run] };
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
  return { state, call, readReport };
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

test('a queued completion that no longer selects work is a successful dispatch no-op', async () => {
  const { mkdtemp, writeFile, readFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { spawnSync } = await import('node:child_process');
  const { state } = fixture();
  const dir = await mkdtemp(join(tmpdir(), 'ci-completion-replay-'));
  try {
    state.config.completion.ciRepair.enabled = false;
    await writeFile(join(dir, 'event.json'), JSON.stringify({ action: 'completed', workflow_run: { id: 123, head_sha: head } }));
    await writeFile(join(dir, 'mock.mjs'), `globalThis.fetch = async (url, options) => {
      if (options.method !== 'GET') throw Error('A stale completion must not write or dispatch');
      const path = url.replace('https://api.github.com/repos/${repository}', '').replace(/^\\//, '');
      const value = path === 'actions/runs/123' ? ${JSON.stringify(state.run)} : path === '' ? {default_branch:'main'} : path === 'commits/main' ? {sha:'${base}'} : path.startsWith('contents/') ? ${JSON.stringify(file(state.config))} : path.startsWith('commits/') ? [${JSON.stringify(state.pr)}] : undefined;
      if (!value) throw Error('Unexpected API request: '+url);
      return {ok:true,status:200,json:async()=>value};
    };`);
    const output = join(dir, 'output');
    const result = spawnSync(process.execPath, ['--import', join(dir, 'mock.mjs'), new URL('../packages/sdlc/src/issue-actions.mjs', import.meta.url).pathname, 'dispatch-prepare'], { encoding: 'utf8', env: { ...process.env, GITHUB_REPOSITORY: repository, GITHUB_REPOSITORY_OWNER: 'owner', GITHUB_ACTOR: 'github-actions[bot]', GITHUB_TRIGGERING_ACTOR: 'github-actions[bot]', GITHUB_EVENT_NAME: 'workflow_run', GITHUB_EVENT_PATH: join(dir, 'event.json'), GITHUB_OUTPUT: output, LIGHTHOUSE_COMPLETION_ENABLED: 'true', LIGHTHOUSE_ISSUE: '47', LIGHTHOUSE_STAGE: 'implement', RUNNER_TEMP: dir, GH_TOKEN: 'fixture' } });
    assert.equal(result.status, 0, result.stderr);
    assert.match(await readFile(output, 'utf8'), /send=false/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});


test('a later owner decision resolves an earlier objection without delegating merge', async () => {
  const { state, call } = fixture();
  state.reviews = [{ id: 1, user: { login: 'owner' }, state: 'CHANGES_REQUESTED' }, { id: 2, user: { login: 'owner' }, state: 'APPROVED', commit_id: head }];
  assert.equal((await call()).worker, 'apply-review');
  assert.equal((await call()).merge, undefined);
  state.reviews.push({ id: 3, user: { login: 'owner' }, state: 'DISMISSED' });
  assert.match((await call()).ciRepairStop, /owner review/);
});


test('a current publication from ordinary owner feedback retains the original implementation identity', async () => {
  const { state, call, readReport } = fixture();
  state.comments[0].body = state.comments[0].body.replace(head, base);
  state.comments.push({ id: 6, user: { login: 'github-actions[bot]', type: 'Bot' }, body: `<!-- lighthouse-stage:implement:passed -->\n<!-- lighthouse-pr-state:{"pr":60,"head":"${head}"} -->` });
  const result = await call({ readReport: async (...args) => args[2].id === 5 ? readReport(...args) : { run: { id: 12, run_attempt: 1 }, request: { runId: 'f'.repeat(64), stage: 'implement', implementationReview: { kind: 'comment', implementationIdentity: identity } } } });
  assert.equal(result.worker, 'apply-review');
  assert.equal(result.ciRepair.grant.runId, '11');
});


test('CI correction cannot supersede an active ordinary feedback correction', async () => {
  const { state, call } = fixture();
  const receipt = { schemaVersion: 1, stage: 'implement', worker: 'apply-review', status: 'running', id: (await import('../packages/sdlc/src/stage-dispatch.mjs')).dispatchId(repository, 12, 'implement'), digest: 'e'.repeat(64), routerRunId: 12, routerAttempt: 1, workerRunId: 22 };
  state.comments.push({ id: 100, issue_url: `https://api.github.com/repos/${repository}/issues/47`, user: { login: 'github-actions[bot]', type: 'Bot' }, body: `<!-- lighthouse-dispatch:${JSON.stringify(receipt)} -->` });
  const prior = { commentId: 100, receipt, request: { id: receipt.id } };
  assert.match((await call({ readDispatch: async () => prior })).ciRepairStop, /owner feedback correction has active/);
  prior.receipt.status = 'completed';
  assert.equal((await call({ readDispatch: async () => prior })).worker, 'apply-review');
});

test('existing scheduled reconciliation signals the same router, preserving approval waits and latest CI facts', async () => {
  const { state } = fixture(), writes = [];
  let runs = [state.run, { ...state.run, id: 124, event: 'pull_request', conclusion: 'action_required' }];
  const api = async (path, method, body) => {
    if (method === 'POST') { writes.push({ path, body }); return; }
    if (path === '') return { default_branch: 'main' };
    assert.equal(path, `actions/runs?head_sha=${head}&per_page=100`);
    return { total_count: runs.length, workflow_runs: runs };
  };
  assert.equal(await signalCiRepair(api, repository, state.pr, state.config), true);
  assert.deepEqual(writes, [{ path: 'actions/workflows/lighthouse-sdlc-router.yml/dispatches', body: { ref: 'main', inputs: { issue: '47', stage: 'implement', after_run: '123' } } }]);
  runs.push({ ...state.run, id: 125, conclusion: 'success' });
  assert.equal(await signalCiRepair(api, repository, state.pr, state.config), false);
  state.config.completion.ciRepair.enabled = false;
  assert.equal(await signalCiRepair(async () => { throw Error('Disabled mode reads no subjects'); }, repository, {}, state.config), false);
  assert.equal(writes.length, 1);
});

test('superseded failures on an unchanged head and current owner draft holds cannot request repair', async () => {
  const { state, call } = fixture();
  state.runs = [state.run, { ...state.run, id: 124, conclusion: 'success' }];
  assert.equal(await call(), null);
  state.runs = [state.run];
  state.comments.push({ user: { login: 'github-actions[bot]', type: 'Bot' }, body: `<!-- lighthouse-pr-hold:60:${head} -->` });
  assert.match((await call()).ciRepairStop, /owner kept this candidate in draft/);
});

test('bot CI wake-ups use adopted workflow facts and wait for terminal status through the existing continuation path', async () => {
  const { completedEvent } = await import('../packages/sdlc/src/stage-dispatch.mjs');
  const { state } = fixture(), waits = [];
  let reads = 0;
  const api = async path => {
    if (path === 'actions/runs/123') return { ...state.run, status: ++reads > 1 ? 'completed' : 'in_progress' };
    if (path === '') return { default_branch: 'main' };
    if (path.startsWith('contents/')) return file(state.config);
    throw Error(path);
  };
  const event = { inputs: { issue: '47', stage: 'implement', after_run: '123' } }, env = { GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_ACTOR: 'github-actions[bot]', GITHUB_TRIGGERING_ACTOR: 'github-actions[bot]', GITHUB_REPOSITORY: repository, GITHUB_REPOSITORY_OWNER: 'owner' };
  assert.equal((await completedEvent(api, event, env, async ms => waits.push(ms))).workflow_run.id, 123);
  assert.deepEqual(waits, [5000]);
  state.run.path = '.github/workflows/unrelated.yml';
  await assert.rejects(completedEvent(api, event, env), /Bot continuation/);
});

test('CI freshness follows attempt start time, including reruns of older run IDs', async () => {
  const { state, call } = fixture();
  state.run.run_started_at = '2026-11-04T10:00:00Z';
  state.runs = [state.run, { ...state.run, id: 124, conclusion: 'success', run_started_at: '2026-11-04T09:00:00Z' }];
  assert.equal((await call()).worker, 'apply-review');
  state.runs[1].run_started_at = '2026-11-04T11:00:00Z';
  state.runs[1].conclusion = 'cancelled';
  assert.equal(await call(), null);
});


test('a failed CI dependency explicitly signals before workflow completion without granting correction', async () => {
  const { state } = fixture(), writes = [];
  const api = async (path, method, body) => {
    if (method === 'POST') { writes.push({ path, body }); return; }
    if (path === 'actions/runs/123/attempts/1') return { ...state.run, status: 'in_progress', conclusion: null };
    if (path === '') return { default_branch: 'main' };
    if (path.startsWith('contents/')) return file(state.config);
    if (path.includes('/jobs?')) return state.jobs;
    if (path.startsWith('commits/')) return [state.pr];
    if (path === 'pulls/60') return state.pr;
    throw Error(path);
  };
  const env = { GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_RUN_ID: '123', GITHUB_RUN_ATTEMPT: '1', GITHUB_SHA: head, LIGHTHOUSE_CI_RESULT: 'failure' };
  assert.equal(await signalCurrentCiRepair(api, repository, env), true);
  assert.deepEqual(writes[0].body.inputs, { issue: '47', stage: 'implement', after_run: '123' });
  state.jobs.jobs[0].conclusion = 'success';
  assert.equal(await signalCurrentCiRepair(api, repository, env), false);
  assert.equal(await signalCurrentCiRepair(api, repository, { ...env, LIGHTHOUSE_CI_RESULT: 'success' }), false);
  assert.equal(writes.length, 1);
});

test('an admitted requester issue retains its authenticated implementation grant for CI repair', async () => {
  const { state, call } = fixture();
  state.issue.user.login = 'requester';
  assert.equal((await call()).worker, 'apply-review');
});


test('simultaneous CI signals coalesce while the matching dispatch is still awaiting admission', async () => {
  const { state, call } = fixture();
  const route = await call();
  const key = ciRepairKey(route.implementationReview);
  const receipt = { schemaVersion: 1, stage: 'implement', worker: 'apply-review', feedbackKey: key, status: 'requested', id: (await import('../packages/sdlc/src/stage-dispatch.mjs')).dispatchId(repository, key, 'implement'), digest: 'e'.repeat(64), routerRunId: 12, routerAttempt: 1, workerRunId: null };
  state.comments.push({ id: 100, issue_url: `https://api.github.com/repos/${repository}/issues/47`, user: { login: 'github-actions[bot]', type: 'Bot' }, body: `<!-- lighthouse-dispatch:${JSON.stringify(receipt)} -->` });
  assert.equal(await call(), null);
});
